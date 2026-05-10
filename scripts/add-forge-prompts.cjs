'use strict';

const fs = require('fs');
const path = require('path');

const PROMPTS_PATH = path.join(__dirname, '..', 'prompts.json');

const NEW_PROMPTS = [
  {
    id: 'forge-sequential-haiku-workflow',
    title: 'Forge Sequential Haiku Workflow',
    service: 'claude',
    domain: 'Agents',
    icon: '⚙️',
    section: 'Agents',
    tier: 'full',
    type: 'flow',
    stars: 4200,
    comments: 187,
    version: 'v1.0',
    featured: true,
    prompt:
      'Build a plan using 4GE:Forge, then create a Markdown workflow for Haiku agents to execute sequentially and directly.\n\n1. FORGE PLAN — Run /forge on the task to produce a phased breakdown with STOP gates.\n2. OPTIMIZE ORDER — Before assigning agents, sort steps by: (a) critical-path dependencies, (b) shared-state conflicts, (c) token budget (Haiku-safe vs escalate).\n3. ASSIGN AGENTS — For each step, assign subagent_type. Steps requiring judgment → Sonnet/Opus. Atomic execution steps → Haiku.\n4. WRITE WORKFLOW — Output a Markdown checklist:\n   - [ ] Step N — [subagent_type] — Goal: ... — Files: ... — Success: ...\n5. EXECUTE — Haiku agents receive only: step goal, input files, output expectation. No reasoning context — just execute.\n6. HANDOFF — Each Haiku agent ends with STATUS + FILES_CHANGED + NEXT_STEP context.\n\nOptimize the task order first. Apply each step in the most efficient sequence. Never skip the order optimization phase.',
    prompt_short:
      'Forge a plan, sort by critical-path + token budget, assign Haiku agents to atomic steps, write a Markdown checklist, execute sequentially. Order optimization required before any execution.',
    prompt_filtered:
      'Given [task], list atomic steps in dependency order. Mark each: [Haiku] (no judgment needed) or [Escalate] (judgment required). Output as numbered Markdown checklist only.',
  },
  {
    id: 'haiku-agent-chain-builder',
    title: 'Haiku Agent Chain Builder',
    service: 'claude',
    domain: 'Agents',
    icon: '🔗',
    section: 'Agents',
    tier: 'full',
    type: 'flow',
    stars: 3100,
    comments: 142,
    version: 'v1.0',
    featured: false,
    prompt:
      'Given a complex task, decompose it into a dependency-ordered chain of Haiku agent calls.\n\nFor each step in the chain:\n1. GOAL — One sentence: what this agent must accomplish.\n2. INPUT — Exact file paths and artifacts from the previous step.\n3. TOOLS — List only the tools this agent is allowed to use (Read/Edit/Bash/Grep/Glob).\n4. OUTPUT — What files or state it must produce for the next step.\n5. SUCCESS CRITERION — One testable condition (e.g., "tsc --noEmit exits 0").\n6. CONTEXT_FOR_NEXT — A self-contained 150-word brief for the next agent (no prior context assumed).\n\nRules:\n- Haiku agents execute, never reason. If reasoning is required, flag as [ESCALATE → Sonnet].\n- Keep CONTEXT_FOR_NEXT under 150 words and include file paths.\n- Never merge steps that touch different subsystems.\n\nOutput as a numbered Markdown list.',
    prompt_short:
      'Decompose [task] into a Haiku agent chain. Per step: goal, input files, allowed tools, output, success criterion, CONTEXT_FOR_NEXT (≤150 words). Flag judgment steps as [ESCALATE → Sonnet].',
    prompt_filtered:
      'List steps for [task] as atomic Haiku agent calls. One line per step: number, action verb, target file, success condition. Flag judgment steps as [ESCALATE].',
  },
  {
    id: 'forge-task-order-optimizer',
    title: 'Forge Task Order Optimizer',
    service: 'claude',
    domain: 'Agents',
    icon: '📊',
    section: 'Agents',
    tier: 'full',
    type: 'flow',
    stars: 2800,
    comments: 98,
    version: 'v1.0',
    featured: false,
    prompt:
      'Before executing any multi-step task, analyze the full task list and produce an optimized execution order.\n\nAnalysis passes:\n1. DEPENDENCY MAP — Which steps block others? Draw the dependency edges.\n2. PARALLEL BRANCHES — Which steps have no shared file state, no D1/R2 writes, no auth side effects? These can run concurrently.\n3. TOKEN BUDGET — Which steps are Haiku-safe (pure execution) vs require Sonnet (moderate reasoning) vs Opus (judgment/security)?\n4. RISK ORDERING — Move high-risk steps (destructive writes, deploys, DB migrations) early so failures surface before downstream work is wasted.\n5. STOP GATES — Insert review checkpoints before irreversible steps.\n\nOutput:\n- DAG (text-based dependency graph)\n- Optimized sequential queue (numbered steps)\n- Parallel batch groups (labeled [BATCH A], [BATCH B], etc.)\n- Model assignment per step ([Haiku] / [Sonnet] / [Opus])\n\nDo not begin execution until order is confirmed.',
    prompt_short:
      'Analyze [task list]: map dependencies, find parallel branches, assign model tier (Haiku/Sonnet/Opus), order by risk. Output: DAG + optimized queue + parallel batches. No execution until order confirmed.',
    prompt_filtered:
      'Given [task list], sort into: (A) parallel-safe (no shared state), (B) must be sequential (with reason). Output two labeled lists only.',
  },
  {
    id: 'sequential-agent-handoff-generator',
    title: 'Sequential Agent Handoff Generator',
    service: 'claude',
    domain: 'Agents',
    icon: '🤝',
    section: 'Agents',
    tier: 'full',
    type: 'agent',
    stars: 2400,
    comments: 76,
    version: 'v1.0',
    featured: false,
    prompt:
      'Generate a structured handoff report between each step in a sequential multi-agent pipeline.\n\nFor every agent-to-agent transition, produce:\n\n```\n## Handoff Report — Step N → Step N+1\n- STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_HANDOFF\n- SUMMARY: [1 sentence — what was accomplished]\n- FILES_CHANGED: [exact relative paths, one per line]\n- NEXT_AGENT: [subagent_type]\n- CONTEXT_FOR_NEXT: [self-contained brief, ≤200 words, includes file paths, no assumed prior context]\n- CONCERNS: [blocking issues, or "none"]\n```\n\nRules:\n- CONTEXT_FOR_NEXT must be fully self-contained. The next agent has zero session memory.\n- If STATUS is BLOCKED, list the exact blocker and stop — do not generate CONTEXT_FOR_NEXT.\n- If STATUS is DONE_WITH_CONCERNS, the lead must review CONCERNS before spawning the next agent.\n- Haiku agents only receive CONTEXT_FOR_NEXT — strip all other fields before passing.\n\nGenerate one report per step transition.',
    prompt_short:
      'Generate handoff reports for [pipeline]. Per transition: STATUS, SUMMARY, FILES_CHANGED, NEXT_AGENT, CONTEXT_FOR_NEXT (≤200 words, self-contained), CONCERNS. Haiku agents receive CONTEXT_FOR_NEXT only.',
    prompt_filtered:
      'Generate a minimal handoff for [step]. STATUS + SUMMARY (1 sentence) + FILES_CHANGED + CONTEXT_FOR_NEXT (≤100 words, self-contained). No other fields.',
  },
  {
    id: 'parallel-to-sequential-converter',
    title: 'Parallel-to-Sequential Converter',
    service: 'claude',
    domain: 'Agents',
    icon: '🔀',
    section: 'Agents',
    tier: 'full',
    type: 'flow',
    stars: 2100,
    comments: 63,
    version: 'v1.0',
    featured: false,
    prompt:
      'Given a list of tasks that could theoretically run in parallel, determine which MUST be sequential.\n\nEvaluation criteria for forced sequencing:\n- Shared file writes — two steps touching the same file or directory\n- Import/build dependencies — step B imports output of step A\n- Database writes — D1/Supabase rows that step B reads from step A\n- Auth token state — token generated in step A, consumed in step B\n- Side effects — deploy/push in step A must complete before step B validates\n- Environment state — env vars set in step A used by step B\n\nOutput:\n\n**List A — Truly Parallel** (safe to run concurrently)\n- Step N: [reason it is safe]\n\n**List B — Must Be Sequential**\n- Step N → Step M: [exact dependency reason]\n\n**Optimized Queue** (final execution order with parallel batches):\n[BATCH 1] Step 2, Step 4, Step 6\n[SEQ] Step 1\n[BATCH 2] Step 3, Step 5\n\nAlways prefer parallel batches where safe — never serialize unnecessarily.',
    prompt_short:
      'Analyze [task list] for forced sequencing (shared state, dependencies, side effects). Output: parallel-safe list + must-be-sequential list + final optimized queue with [BATCH] labels.',
    prompt_filtered:
      'Which of [task list] must run sequentially and why? List only constrained pairs as: Step N → Step M: [reason]. Everything else is parallel-safe.',
  },
  {
    id: 'haiku-execution-plan-writer',
    title: 'Haiku Execution Plan Writer',
    service: 'claude',
    domain: 'Agents',
    icon: '📋',
    section: 'Agents',
    tier: 'full',
    type: 'prompt',
    stars: 1900,
    comments: 54,
    version: 'v1.0',
    featured: false,
    prompt:
      'Write a minimal-token execution plan for a Haiku agent to follow directly.\n\nFormatting rules (non-negotiable):\n- One line per step\n- Format: [N]. [VERB] [target file or path] → [success condition]\n- No multi-sentence explanations — one verb-first imperative per step\n- No preamble, no reasoning, no alternatives listed\n- Every step is atomic: one tool call, one outcome\n\nEscalation rule:\n- If a step requires judgment → write: [N]. [ESCALATE → Sonnet] [reason in ≤10 words]\n- Haiku must stop at [ESCALATE] and return the reason — never attempt judgment\n\nExample output:\n1. Read src/routes/auth.ts → understand JWT middleware shape\n2. Edit src/routes/auth.ts line 42 → add rate limiter key prefix\n3. Bash: npm run typecheck → exits 0\n4. [ESCALATE → Sonnet] ambiguous token rotation strategy\n5. Edit src/routes/auth.ts → apply Sonnet decision\n\nOutput the numbered plan only. No header, no footer.',
    prompt_short:
      'Write a Haiku execution plan for [task]: one line per step, verb-first, one tool call each, no reasoning. Flag judgment steps as [ESCALATE → Sonnet reason ≤10 words]. Output numbered list only.',
    prompt_filtered:
      'Convert [task] to a 5-step Haiku plan. Each step: number, action verb, target, success condition. One line each. Flag judgment steps as [ESCALATE]. Output list only.',
  },
];

function main() {
  console.log('Reading prompts.json...');
  const data = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'));
  console.log('Loaded', data.length, 'entries.');

  const existingIds = new Set(data.map((e) => e.id));
  const toAdd = NEW_PROMPTS.filter((p) => {
    if (existingIds.has(p.id)) {
      console.log('Skipping (already exists):', p.id);
      return false;
    }
    return true;
  });

  if (!toAdd.length) {
    console.log('Nothing to add.');
    return;
  }

  // Featured entries go at position 0 (before existing featured)
  // Non-featured entries go after existing featured (position 6)
  const featured = toAdd.filter((p) => p.featured);
  const regular = toAdd.filter((p) => !p.featured);
  const updated = [...featured, ...data.slice(0, 6), ...regular, ...data.slice(6)];

  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(updated, null, 2), 'utf8');
  console.log('Added', toAdd.length, 'prompts. New total:', updated.length);
  console.log('IDs added:', toAdd.map((p) => p.id).join(', '));
}

main();
