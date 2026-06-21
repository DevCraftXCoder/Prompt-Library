'use strict';

/**
 * add-system-prompts.cjs — ingest the asgeirtj/system_prompts_leaks corpus (CC0 1.0)
 * into the Prompt Library as a searchable "System Prompts" section.
 *
 * Manifest-first: walks a local clone, writes system-prompts-manifest.json (full
 * inventory), then appends deduped library entries (preview + source link) to
 * prompts.json. The full prompt text is NOT inlined — entries carry a ~2000-char
 * preview plus a link to the upstream file, keeping prompts.json lean.
 *
 * Usage:
 *   git clone --depth 1 https://github.com/asgeirtj/system_prompts_leaks <dir>
 *   node scripts/add-system-prompts.cjs --repo <dir>
 *
 * Idempotent: re-running skips ids already present in prompts.json. The manifest
 * is always rewritten in full. Run again after pulling upstream to refresh.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const argv = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };

const REPO = argv('--repo', null);
const PROMPTS_PATH = path.join(__dirname, '..', 'prompts.json');
const MANIFEST_PATH = path.join(__dirname, '..', 'system-prompts-manifest.json');
const UPSTREAM = 'https://github.com/asgeirtj/system_prompts_leaks';
const BRANCH = 'main';
const PREVIEW_CHARS = 2000;
const SHORT_CHARS = 280;

if (!REPO || !fs.existsSync(REPO)) {
  console.error('Usage: node scripts/add-system-prompts.cjs --repo <path-to-system_prompts_leaks-clone>');
  process.exit(1);
}

const INCLUDE_EXT = new Set(['.md', '.txt', '.xml', '.json']);
const SKIP_BASENAME = new Set(['readme.md', 'license', 'license.md', 'contributing.md', 'code_of_conduct.md']);
const SKIP_DIR = new Set(['.git', '.github', 'node_modules']);

const VENDOR_ICON = {
  Anthropic: '🟧', OpenAI: '⚪', Google: '🔵', Cursor: '🖱️', Meta: '🔷',
  Microsoft: '🪟', Mistral: '🌬️', Notion: '📓', Perplexity: '🔍',
  Qwen: '🅀', xAI: '✖️', Misc: '📄',
};

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (SKIP_DIR.has(name)) continue;
      walk(abs, base, out);
    } else {
      out.push(path.relative(base, abs).split(path.sep).join('/'));
    }
  }
  return out;
}

const slug = (s) => s.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const humanize = (seg) => seg.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/\b\w/g, (c) => c.toUpperCase());

const files = walk(REPO, REPO, []).sort();
const manifest = [];
const libraryEntries = [];
const seenIds = new Set(); // disambiguate intra-batch slug collisions (e.g. .md vs .xml, '#' vs ' ')

for (const rel of files) {
  const ext = path.extname(rel).toLowerCase();
  const baseLower = path.basename(rel).toLowerCase();
  if (!INCLUDE_EXT.has(ext) || SKIP_BASENAME.has(baseLower)) continue;

  const segs = rel.split('/');
  const vendor = segs[0];
  const restSegs = segs.slice(1);
  if (restSegs.length === 0) continue; // top-level non-vendor file

  const content = fs.readFileSync(path.join(REPO, rel), 'utf8');
  const lines = content.split('\n').length;
  const preview = content.slice(0, PREVIEW_CHARS).replace(/\n{3,}/g, '\n\n').trimEnd();
  const short = content.replace(/\s+/g, ' ').trim().slice(0, SHORT_CHARS);
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const githubUrl = `${UPSTREAM}/blob/${BRANCH}/${rel.split('/').map(encodeURIComponent).join('/')}`;
  let id = `sysprompt-${slug(rel)}`;
  if (seenIds.has(id)) id = `${id}-${sha256.slice(0, 6)}`; // collision-stable suffix
  seenIds.add(id);
  const title = restSegs.map(humanize).join(' · ');
  const icon = VENDOR_ICON[vendor] || '📄';

  manifest.push({ id, vendor, title, path: rel, github_url: githubUrl, lines, sha256, preview: short });

  libraryEntries.push({
    id,
    title,
    service: vendor.toLowerCase(),
    domain: 'System Prompts',
    icon,
    section: 'System Prompts',
    tier: 'full',
    type: 'system',
    stars: 0,
    comments: 0,
    version: 'v1.0',
    featured: false,
    apps: [vendor],
    source_url: githubUrl,
    prompt: `${preview}\n\n— Full prompt (${lines} lines): ${githubUrl}`,
    prompt_short: short,
  });
}

// Manifest is always rewritten in full (complete inventory).
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

// Dedupe against existing prompts.json by id.
const existing = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'));
const existingIds = new Set(existing.map((p) => p.id));
const fresh = libraryEntries.filter((e) => !existingIds.has(e.id));
const merged = [...existing, ...fresh];
fs.writeFileSync(PROMPTS_PATH, JSON.stringify(merged, null, 2), 'utf8');

const byVendor = manifest.reduce((m, e) => { m[e.vendor] = (m[e.vendor] || 0) + 1; return m; }, {});
console.log(`Manifest: ${manifest.length} system prompts written to system-prompts-manifest.json`);
console.log(`By vendor: ${Object.entries(byVendor).map(([v, n]) => `${v}=${n}`).join(', ')}`);
console.log(`Library: +${fresh.length} new (${libraryEntries.length - fresh.length} already present). Total prompts: ${merged.length}`);
