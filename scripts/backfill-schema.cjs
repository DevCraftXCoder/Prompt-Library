'use strict';

const fs = require('fs');
const path = require('path');

const PROMPTS_PATH = path.join(__dirname, '..', 'prompts.json');

// ─── 6 featured entries to prepend ───────────────────────────────────────────
const FEATURED_ENTRIES = [
  {
    id: 'featured-adversarial-code-reviewer',
    title: 'Adversarial Code Reviewer',
    service: 'claude',
    domain: 'Code Review',
    icon: '🔍',
    section: 'Featured',
    tier: 'full',
    type: 'agent',
    stars: 4900,
    comments: 312,
    version: 'v2.1',
    featured: true,
    prompt:
      'You are an adversarial code reviewer performing a 7-pass deep audit of a pull request or codebase.\n\nPass 1 — EXISTENCE: Verify every import resolves, every package is on npm/pypi, no deprecated APIs.\nPass 2 — SECURITY: OWASP Top 10 scan, injection vectors, secrets in source, taint analysis.\nPass 3 — LOGIC: Race conditions, off-by-one errors, inverted booleans, tautological tests, falsy-value bugs.\nPass 4 — RUNTIME: Missing await, global state, environment mismatches, wrong Node.js/browser API usage.\nPass 5 — TRUST: Boundary validation, type assertion hiding, unvalidated external data.\nPass 6 — ARTIFACTS: Dead exports, orphaned variables, copy-paste drift, excessive complexity, TODO without tickets.\nPass 7 — PROVENANCE: Prompt injection artifacts, AI hallucinated APIs, stale delegation patterns.\n\nFor each finding: file path, line number, severity (P0–P3), exact fix.\nOutput a VERDICT: PASS | PASS_WITH_CONCERNS | FAIL.',
    prompt_short:
      'Run a 7-pass adversarial audit (Existence → Security → Logic → Runtime → Trust → Artifacts → Provenance) on [code]. File/line, P0–P3, fix. Output: VERDICT.',
    prompt_filtered:
      'Perform only Pass 2 (SECURITY) and Pass 7 (PROVENANCE) on [code]. Focus on injection vectors, OWASP Top 10, and hallucinated/deprecated API usage. File/line, severity, fix.',
  },
  {
    id: 'featured-autonomous-research-lead',
    title: 'Autonomous Research Lead',
    service: 'claude',
    domain: 'Research',
    icon: '🔬',
    section: 'Featured',
    tier: 'full',
    type: 'agent',
    stars: 3200,
    comments: 184,
    version: 'v1.4',
    featured: true,
    prompt:
      'You are an autonomous research lead. Given a question or decision to investigate:\n\n1. PLAN — Break the question into 3–5 sub-questions that together fully answer the main question.\n2. SEARCH — For each sub-question, identify the best sources (docs, papers, codebases, changelogs).\n3. SUMMARIZE — Distill each source into a 2–3 sentence grounding statement with citation.\n4. SYNTHESIZE — Combine grounding statements into a coherent answer.\n5. SCORE — Assign a confidence score (0–100%) and list key uncertainties.\n6. DISSENT — Write the strongest counter-argument to your conclusion.\n7. MEMO — Output a structured decision memo: Question / Answer / Evidence / Confidence / Dissent / Recommendation.\n\nNever fabricate citations. If you cannot find a source, say so explicitly.',
    prompt_short:
      'Research [question]: plan sub-questions, search sources, summarize evidence, synthesize answer, score confidence, write dissent, output decision memo with citations.',
    prompt_filtered:
      'Research [question] using only the provided context window. No external search. Summarize available evidence, synthesize answer, flag gaps, assign confidence score.',
  },
  {
    id: 'featured-doc-grade-summarizer',
    title: 'Doc-Grade Summarizer',
    service: 'claude',
    domain: 'Writing',
    icon: '📄',
    section: 'Featured',
    tier: 'full',
    type: 'prompt',
    stars: 2700,
    comments: 96,
    version: 'v3.0',
    featured: true,
    prompt:
      'Summarize the following long-form document into a structured brief.\n\nRules:\n- Preserve all technical intent — do not simplify or omit nuance\n- Preserve all code blocks verbatim — never paraphrase code\n- Preserve all file paths and source references\n- Preserve all numbered steps and their order\n- Do not introduce information not in the source\n\nOutput format:\n## TL;DR (1–2 sentences)\n## Key Points (bullet list, max 8)\n## Code Blocks Preserved (verbatim, with original context label)\n## Source References (all file paths and URLs mentioned)\n## What Was Omitted (anything you cut for length, with reason)\n\n[DOCUMENT BELOW]',
    prompt_short:
      'Summarize [document] into: TL;DR, Key Points (max 8), Code Blocks (verbatim), Source References, What Was Omitted. No paraphrasing of code or file paths.',
    prompt_filtered:
      'Summarize [document] in 3 sentences max. Preserve any code blocks verbatim. List file paths and source references. No new information.',
  },
  {
    id: 'featured-chain-of-thought-planner',
    title: 'Chain-of-Thought Planner',
    service: 'claude',
    domain: 'Reasoning',
    icon: '🧠',
    section: 'Featured',
    tier: 'full',
    type: 'flow',
    stars: 5100,
    comments: 410,
    version: 'v2.3',
    featured: true,
    prompt:
      'Decompose the following ambiguous task into a concrete, ordered execution plan.\n\nProcess:\n1. CLARIFY — State what is ambiguous and your assumed interpretation.\n2. BREAK DOWN — List all atomic subtasks in dependency order.\n3. ESTIMATE — For each subtask: expected tokens to complete, complexity (S/M/L).\n4. GUARD — For each subtask: what could go wrong, how to detect it, fallback action.\n5. SEQUENCE — Output the final ordered plan as numbered steps with: goal, input, output, success criterion.\n6. COST CHECK — Estimate total token cost. If > 50k tokens, flag which steps to delegate or cache.\n\nOutput a plan that a developer can execute step-by-step without further clarification.',
    prompt_short:
      'Decompose [task]: clarify ambiguity, list atomic subtasks in dependency order, estimate cost/complexity per step, add guards, output numbered plan with success criteria.',
    prompt_filtered:
      'Decompose [task] into max 5 atomic subtasks in dependency order. One sentence per subtask: goal, input, output, success criterion. No estimation needed.',
  },
  {
    id: 'featured-ui-screenshot-critique',
    title: 'UI Screenshot Critique',
    service: 'claude',
    domain: 'Design',
    icon: '🖼️',
    section: 'Featured',
    tier: 'full',
    type: 'prompt',
    stars: 1800,
    comments: 67,
    version: 'v1.0',
    featured: true,
    prompt:
      'Audit the attached UI screenshot against the following dimensions. For each issue, output: location (describe position), severity (P0=broken, P1=major UX, P2=minor, P3=polish), and a diff suggestion (what to change).\n\nDimensions to check:\n1. ACCESSIBILITY — Color contrast (WCAG AA minimum), missing alt text signals, touch target size (<44px is P1)\n2. VISUAL HIERARCHY — Is the primary action obvious? Does the eye flow logically? Is there a clear focal point?\n3. SPACING — Inconsistent padding/margin, crowded elements, excessive whitespace\n4. TYPOGRAPHY — Mixed font weights without purpose, unreadable sizes, missing hierarchy\n5. BRAND CONSISTENCY — Does it match the stated brand system? Color tokens, radius, elevation\n6. RESPONSIVE SIGNALS — Any obvious mobile breakdown patterns visible in the screenshot\n7. EMPTY/ERROR STATES — Are there UI elements that appear to be missing loading/empty/error states?\n\nEnd with: TOP 3 QUICK WINS (highest impact, lowest effort changes).',
    prompt_short:
      'Audit [screenshot] across: accessibility, hierarchy, spacing, typography, brand, responsive, empty states. Per issue: location, P0–P3, diff suggestion. End: Top 3 Quick Wins.',
    prompt_filtered:
      'Check [screenshot] for accessibility only: color contrast (WCAG AA), touch targets (<44px), missing alt text signals. P0–P3 per finding with fix suggestion.',
  },
  {
    id: 'featured-threat-model-owasp',
    title: 'Threat Model & OWASP Scan',
    service: 'claude',
    domain: 'Security',
    icon: '🛡️',
    section: 'Featured',
    tier: 'full',
    type: 'agent',
    stars: 3600,
    comments: 248,
    version: 'v2.0',
    featured: true,
    prompt:
      'Perform a STRIDE threat model and OWASP Top 10 audit pass on the described system or codebase.\n\nSTRIDE Analysis:\n- Spoofing — How could an attacker impersonate a user or service?\n- Tampering — What data or code could be modified maliciously?\n- Repudiation — What actions lack audit trails?\n- Information Disclosure — What sensitive data could leak?\n- Denial of Service — What paths could be overwhelmed?\n- Elevation of Privilege — How could a low-privilege actor gain admin access?\n\nOWASP Top 10 Scan (2021):\nA01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable Components, A07 Auth Failures, A08 Integrity Failures, A09 Logging Failures, A10 SSRF.\n\nFor each finding: threat category, attack vector, affected component (file/path if possible), severity (Critical/High/Medium/Low), remediation step.\n\nOutput: STRIDE table → OWASP findings → Remediation Priority Order.',
    prompt_short:
      'STRIDE + OWASP Top 10 audit of [system]. Per finding: category, vector, component, severity, remediation. Output: STRIDE table → OWASP findings → Priority order.',
    prompt_filtered:
      'Check [system] for A03 Injection and A07 Authentication Failures only (OWASP 2021). List attack vectors, affected paths, severity, and remediation steps. Max 5 findings.',
  },
];

// ─── Heuristics ───────────────────────────────────────────────────────────────
const AGENT_KEYWORDS = ['agent', 'reviewer', 'orchestrator', 'assistant', 'researcher', 'auditor', 'critic'];
const FLOW_KEYWORDS = ['pipeline', 'workflow', 'multi-step', 'chain', 'deploy', 'sequence', 'refactor pass'];
const SYSTEM_KEYWORDS = ['system prompt', 'persona', 'role', 'senior engineer', 'cto', 'architect persona'];

/**
 * Derive `type` from title + domain + first 80 chars of prompt.
 * @param {Object} entry
 * @returns {string}
 */
function deriveType(entry) {
  const haystack = [
    entry.title || '',
    entry.domain || '',
    (entry.prompt || '').slice(0, 80),
  ]
    .join(' ')
    .toLowerCase();

  if (AGENT_KEYWORDS.some((kw) => haystack.includes(kw))) return 'agent';
  if (FLOW_KEYWORDS.some((kw) => haystack.includes(kw))) return 'flow';
  if (SYSTEM_KEYWORDS.some((kw) => haystack.includes(kw))) return 'system';
  return 'prompt';
}

/**
 * Derive `stars` — deterministic per id.
 * @param {string} id
 * @returns {number}
 */
function deriveStars(id) {
  return Math.floor((id.charCodeAt(0) * 137 + id.length * 23) % 4800) + 200;
}

/**
 * Derive `comments` — deterministic per id.
 * @param {string} id
 * @returns {number}
 */
function deriveComments(id) {
  return Math.floor((id.charCodeAt(id.length - 1) * 97 + id.length * 7) % 480) + 20;
}

/**
 * Derive `version` from tier.
 * @param {string} tier
 * @returns {string}
 */
function deriveVersion(tier) {
  const map = {
    full: 'v2.0',
    combo: 'v1.5',
    quick: 'v1.0',
    paragraph: 'v1.2',
  };
  return map[tier] || 'v1.0';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('Reading prompts.json …');
  const raw = fs.readFileSync(PROMPTS_PATH, 'utf8');
  const data = JSON.parse(raw);
  console.log(`Loaded ${data.length} entries.`);

  // Dedup featured entries — skip if already present by id
  const existingIds = new Set(data.map((e) => e.id));
  const toInsert = FEATURED_ENTRIES.filter((fe) => {
    if (existingIds.has(fe.id)) {
      console.log(`  Skipping featured entry "${fe.id}" — already exists.`);
      return false;
    }
    return true;
  });

  // Prepend new featured entries
  const allEntries = [...toInsert, ...data];
  console.log(`Prepended ${toInsert.length} new featured entries.`);

  // Backfill fields on every entry
  const typeCounts = { agent: 0, flow: 0, system: 0, prompt: 0 };

  for (const entry of allEntries) {
    // featured: only already-featured entries keep true; all others → false
    if (!entry.featured) {
      entry.featured = false;
    }

    // type — featured entries already have type set; derive for all others
    if (!entry.featured || !entry.type) {
      entry.type = deriveType(entry);
    }
    typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;

    // stars — always recompute (idempotent)
    if (typeof entry.stars === 'undefined' || !entry.featured) {
      // For featured entries, preserve the hand-crafted values; for others derive.
      if (!entry.featured) {
        entry.stars = deriveStars(entry.id);
        entry.comments = deriveComments(entry.id);
        entry.version = deriveVersion(entry.tier);
      }
    }
  }

  // Recount types after featured pass
  const finalTypeCounts = { agent: 0, flow: 0, system: 0, prompt: 0 };
  for (const e of allEntries) {
    finalTypeCounts[e.type] = (finalTypeCounts[e.type] || 0) + 1;
  }

  const featuredCount = allEntries.filter((e) => e.featured).length;
  console.log(`Total entries after backfill: ${allEntries.length}`);
  console.log(`Featured: ${featuredCount}`);
  console.log('Type distribution:', finalTypeCounts);

  console.log('Writing prompts.json …');
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(allEntries, null, 2), 'utf8');
  console.log('Done.');
}

main();
