'use strict';

// ─── BM25F constants ─────────────────────────────────────────────────────────
const FIELDS = ['title', 'domain', 'section', 'prompt_short', 'prompt'];
const FIELD_WEIGHTS = { title: 4.0, domain: 2.5, section: 1.5, prompt_short: 2.0, prompt: 1.0 };
const K1 = 1.2;
const B  = 0.75;

// ─── Index state (rebuilt when prompts array reference changes) ───────────────
let _indexPrompts  = null;
let _invertedIndex = null;  // Map<token, Set<docIdx>>
let _tfStore       = null;  // Array<{ [field]: { [tok]: count } }>
let _docLengths    = null;  // Array<{ [field]: tokenCount }>
let _avgdl         = null;  // { [field]: avgTokenCount }
let _idf           = null;  // Map<token, idfValue>
let _N             = 0;

function tokenize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function buildIndex(prompts) {
  const N = prompts.length;
  const index      = new Map();   // token → Set<docIdx>
  const tfStore    = [];
  const docLengths = [];
  const df         = new Map();   // token → docCount (across all fields per doc)

  for (let i = 0; i < N; i++) {
    const p   = prompts[i];
    const tf  = {};
    const len = {};
    const seenInDoc = new Set();

    for (const field of FIELDS) {
      const toks = tokenize(p[field]);
      len[field] = toks.length;
      const counts = {};
      for (const tok of toks) {
        counts[tok] = (counts[tok] || 0) + 1;
        if (!index.has(tok)) index.set(tok, new Set());
        index.get(tok).add(i);
        seenInDoc.add(tok);
      }
      tf[field] = counts;
    }

    for (const tok of seenInDoc) df.set(tok, (df.get(tok) || 0) + 1);
    tfStore.push(tf);
    docLengths.push(len);
  }

  // avgdl per field
  const avgdl = {};
  for (const field of FIELDS) {
    const sum = docLengths.reduce((a, d) => a + (d[field] || 0), 0);
    avgdl[field] = N > 0 ? sum / N : 1;
  }

  // IDF per token (Robertson-Sparck Jones)
  const idf = new Map();
  for (const [tok, count] of df) {
    idf.set(tok, Math.log((N - count + 0.5) / (count + 0.5) + 1));
  }

  return { index, tfStore, docLengths, avgdl, idf, N };
}

function getIndex(prompts) {
  if (_indexPrompts !== prompts) {
    _indexPrompts = prompts;
    const built   = buildIndex(prompts);
    _invertedIndex = built.index;
    _tfStore       = built.tfStore;
    _docLengths    = built.docLengths;
    _avgdl         = built.avgdl;
    _idf           = built.idf;
    _N             = built.N;
  }
  return _invertedIndex;
}

// ─── BM25F scoring ────────────────────────────────────────────────────────────
function bm25Score(docIdx, queryTokens, rawQuery) {
  const tf   = _tfStore[docIdx];
  const dlen = _docLengths[docIdx];
  let score  = 0;

  for (const tok of queryTokens) {
    const idfVal = _idf.get(tok) || 0;
    if (idfVal === 0) continue;

    // BM25F: weighted TF contribution across fields
    let weightedTf = 0;
    for (const field of FIELDS) {
      const termFreq = (tf[field] && tf[field][tok]) || 0;
      if (termFreq === 0) continue;
      const avgdl = _avgdl[field] || 1;
      const docLen = dlen[field] || 0;
      const tfNorm = termFreq / (termFreq + K1 * (1 - B + B * docLen / avgdl));
      weightedTf += FIELD_WEIGHTS[field] * tfNorm;
    }
    score += idfVal * weightedTf;
  }

  // Phrase-level bonuses (precision for exact-match queries)
  const ql = rawQuery.toLowerCase();
  const p  = _indexPrompts[docIdx];
  const titleLc = (p.title || '').toLowerCase();
  if (titleLc === ql) score += 8;
  else if (titleLc.includes(ql)) score += 4;
  if ((p.domain || '').toLowerCase().includes(ql)) score += 2;

  // Quality boosts
  if (p.featured) score += 5;
  const stars = p.stars || 0;
  if (stars > 0) score += Math.log10(stars + 1) * 2;
  if ((parseFloat(p.version) || 1) >= 2) score += 1;

  return score;
}

// ─── LRU memo (cap 50) ───────────────────────────────────────────────────────
const _memo = new Map();
const MEMO_CAP = 50;

function memoGet(key) {
  if (!_memo.has(key)) return null;
  const val = _memo.get(key);
  _memo.delete(key);
  _memo.set(key, val);
  return val;
}

function memoSet(key, val) {
  if (_memo.size >= MEMO_CAP) _memo.delete(_memo.keys().next().value);
  _memo.set(key, val);
}

// ─── Fuzzy fallback (Levenshtein ≤ 2) ───────────────────────────────────────
function editDist(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function fuzzyExpand(index, tok) {
  const out = new Set();
  for (const [key, idxSet] of index) {
    if (editDist(tok, key) <= 2) for (const i of idxSet) out.add(i);
  }
  return out;
}

// ─── Public: query ────────────────────────────────────────────────────────────
function query(prompts, q, limit = 5) {
  const memoKey = `${q}\x00${limit}`;
  const hit = memoGet(memoKey);
  if (hit) return hit;

  const index       = getIndex(prompts);
  const queryTokens = tokenize(q);

  // Candidate set via inverted index (union across tokens)
  const candidates = new Set();
  for (const tok of queryTokens) {
    if (index.has(tok)) for (const i of index.get(tok)) candidates.add(i);
  }

  // Fuzzy fallback on zero candidates
  if (candidates.size === 0) {
    for (const tok of queryTokens) for (const i of fuzzyExpand(index, tok)) candidates.add(i);
  }

  const rawQuery = q.trim();
  const results = [...candidates]
    .map(i => ({ ...prompts[i], _score: bm25Score(i, queryTokens, rawQuery) }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...p }) => p);

  memoSet(memoKey, results);
  return results;
}

// ─── Public: filter + sort ───────────────────────────────────────────────────
function filter(prompts, { type, service, domain, tier } = {}) {
  let pool = prompts;
  if (type)    pool = pool.filter(p => p.type === type);
  if (service) pool = pool.filter(p => p.service === service);
  if (domain)  pool = pool.filter(p => (p.domain || '').toLowerCase() === domain.toLowerCase());
  if (tier)    pool = pool.filter(p => p.tier === tier);
  return pool;
}

const SORT_FNS = {
  stars:    (a, b) => (b.stars || 0) - (a.stars || 0),
  version:  (a, b) => (parseFloat(b.version) || 1) - (parseFloat(a.version) || 1),
  featured: (a, b) => ((b.featured ? 1 : 0) - (a.featured ? 1 : 0)) || ((b.stars || 0) - (a.stars || 0)),
};

function filterAndSort(prompts, filters = {}, sort = null) {
  const pool = filter(prompts, filters);
  if (sort && SORT_FNS[sort]) return [...pool].sort(SORT_FNS[sort]);
  return pool;
}

// ─── Public: quality-biased random ───────────────────────────────────────────
function random(prompts, filters = {}) {
  const pool = filter(prompts, filters);
  if (!pool.length) return null;
  const weights = pool.map(p => (p.featured ? 50 : 1) * Math.log10((p.stars || 0) + 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

module.exports = { query, filter, filterAndSort, random };
