<div align="center">

> **Copy-Paste Ready** — Every prompt in this library is production-tested and tiered by depth. Quick prompts resolve in one shot. Combo prompts chain context across a workflow. Paragraph prompts generate complete, structured deliverables.

# Prompt Library

### 1000+ Production-Ready Prompts Organized by Tier (Quick / Combo / Paragraph) for AI-Assisted Development, Security, and Workflows

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Prompts](https://img.shields.io/badge/Prompts-1000%2B-blue.svg)](#whats-included)
[![Tiers](https://img.shields.io/badge/Tiers-Quick%20%7C%20Combo%20%7C%20Paragraph-purple.svg)](#tier-system)
[![Sections](https://img.shields.io/badge/Sections-33-orange.svg)](#whats-included)
[![Format](https://img.shields.io/badge/Format-JSON%20%2B%20TypeScript-lightgrey.svg)](#whats-included)

**1000+ production-ready prompts organized by tier (Quick/Combo/Paragraph) for AI-assisted development, security, and workflows.**

[Tier System](#tier-system) | [What's Included](#whats-included) | [Example Prompts](#example-prompts)

</div>

---

## Overview

Prompt Library is a structured collection of production-tested AI prompts organized across 33 sections and 5 domains. Each prompt is categorized into one of three tiers based on the depth and complexity of the expected output.

The library is built for developers, security practitioners, and AI-assisted workflow designers who need prompts that work on the first attempt without customization guesswork.

---

## Architecture

```
prompts.json
  |
  +-- domain: Build
  |     +-- section: Code Review
  |     |     +-- tier: quick   [ one-shot, < 30 words ]
  |     |     +-- tier: combo   [ multi-step, chained context ]
  |     |     +-- tier: paragraph [ complete structured output ]
  |     +-- section: Refactor
  |     +-- section: ...
  |
  +-- domain: Ship
  +-- domain: Run & Secure
  +-- domain: Know & Grow
  +-- domain: Connect & People
```

Each prompt entry includes:

```
{
  "id": "build-code-review-q-001",
  "tier": "quick",
  "section": "Code Review",
  "domain": "Build",
  "tags": ["code-quality", "typescript"],
  "prompt": "Review this function for edge cases and return a bullet list of issues only."
}
```

---

## Tier System

### Quick

One-shot prompts that resolve in a single AI response. Use these when you need a direct answer, a concise list, or a short transformation without context threading.

- Target output length: 1-3 sentences or a bullet list
- No prior context required
- Optimized for copy-paste into any AI client

### Combo

Multi-step prompts designed to be used in sequence across a workflow. Each prompt in a combo chain references the output of the previous step. Use these for end-to-end task flows — audit + fix, research + plan, review + report.

- Target output: structured intermediate artifact consumed by the next prompt
- Context threading: each prompt specifies what prior context to include
- Optimized for multi-turn AI sessions and agent handoffs

### Paragraph

Prompts that generate complete, structured deliverables — full reports, architectural proposals, implementation plans, security assessments. Use these when the AI needs to produce a standalone document.

- Target output: 200-2000 words, structured with headers
- Self-contained: does not require prior context (includes full instructions)
- Optimized for final deliverables, not intermediate artifacts

---

## What's Included

33 sections across 5 domains:

### Build
Code Review, Refactor, Implement Feature, Write Tests, Debug, Architecture, Database, API Design, Documentation, Dependency Audit

### Ship
Deploy, CI/CD, Release Notes, Changelog, Migration, Performance, Monitoring, Rollback

### Run & Secure
Threat Modeling, Security Review, Incident Response, Vulnerability Assessment, Access Control, Secrets Management

### Know & Grow
Research, Learning Path, Onboarding, ADR (Architecture Decision Records), Postmortem

### Connect & People
PR Review, Code Explanation, Team Communication, Stakeholder Update, Hiring

---

## Example Prompts

### Quick — Code Review

```
Review this function for edge cases and return a bullet list of issues only.
Do not suggest refactors. Focus on correctness and missing error handling.
```

### Quick — Debug

```
Read the stack trace below and identify the root cause in one sentence.
Then state which file and line to fix, and what the fix is.
```

### Combo — Audit + Fix

```
Step 1: Run a security audit on this codebase section. List every issue as:
[SEVERITY] FINDING: <description> | FILE: <path> | LINE: <number>

Step 2 (after audit): For each HIGH or CRITICAL finding from Step 1,
provide the exact code fix. Do not explain — only show the fixed code block.
```

### Paragraph — Threat Model

```
You are a senior security architect. Produce a complete threat model for the
system described below using the STRIDE framework. Include: system description,
trust boundaries, data flows, threat table (threat / attack vector / mitigation
/ severity), and a prioritized remediation list.

System: [paste system description here]
```

### Paragraph — Architecture Proposal

```
Produce a complete architecture proposal for the feature described below.
Include: overview, component diagram (ASCII), tech stack with rationale,
data model, API contract, security considerations, and open questions.
Feature: [paste feature description here]
```

---

## Appendix A: Universal Quick Prompts

These prompts work across any domain and any AI client without modification.

```
1.  Summarize this in three bullet points.
2.  What is the single most critical issue here?
3.  Rewrite this to be clearer and more concise. Keep all technical content.
4.  What is missing from this document?
5.  Identify all assumptions embedded in this plan.
6.  What are the failure modes of this approach?
7.  Translate this for a non-technical stakeholder in two sentences.
8.  List the dependencies this change introduces.
9.  What would you change if performance were the only constraint?
10. What would you change if security were the only constraint?
```

---

## Recent Additions

- **25 product launch / social media prompts** — new section covering Product Hunt, Reddit, LinkedIn, Twitter/X, HN launch copy, cold DMs, and founder story templates
- **Post-project-update prompt** — structured template for posting regular project goal updates across social platforms
- **Try-a-different-approach prompt** — quick prompt for breaking out of stuck debugging cycles with a fresh angle
- **Library intro redesign** — swapped dashboard terminal to a real pnpm quick-access flow showing `degit` → `prompts.json`
- **Library website overhaul** — cmdk search shell with ⌘K hotkey, prompt-type taxonomy tabs, featured prompts row, card metadata parity

---

## Quick Access

Pull the full library locally — no git history, no install:

```bash
pnpm dlx degit DevCraftXCoder/Prompt-Library prompt-library
```

Consume `prompts.json` directly in your project:

```bash
# Fetch the raw JSON (3931 prompts)
curl -s https://raw.githubusercontent.com/DevCraftXCoder/Prompt-Library/main/prompts.json | pnpm dlx json-query ".[0:5]"
```

---

## Contributing

All contributions must follow the tier structure. Submit new prompts with:

- `id`: `{domain}-{section}-{tier-initial}-{sequence}` (e.g. `build-debug-q-042`)
- `tier`: `quick`, `combo`, or `paragraph`
- `domain`: one of the 5 domains listed above
- `section`: one of the 33 sections listed above
- `tags`: 1-3 lowercase kebab-case tags
- `prompt`: the prompt text with no system instructions embedded (user-turn only)

Test each prompt against at least one AI client before submitting. Prompts that produce inconsistent output across multiple runs are not accepted.

---

## License

MIT License. Copyright 2026 DevCraftXCoder. See [LICENSE](LICENSE).
