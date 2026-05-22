<div align="center">

> **Copy-Paste Ready** — Every prompt is production-tested and tiered by depth. Quick prompts resolve in one shot. Combo prompts chain context across a workflow. Paragraph prompts generate complete, structured deliverables.

# Prompt Library

### 3,900+ Production-Ready Prompts — Organized by Tier, Domain, and Model

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Prompts](https://img.shields.io/badge/Prompts-3900%2B-blue.svg)](#whats-included)
[![Tiers](https://img.shields.io/badge/Tiers-Quick%20%7C%20Combo%20%7C%20Paragraph-purple.svg)](#tier-system)
[![Sections](https://img.shields.io/badge/Sections-6-orange.svg)](#whats-included)
[![Format](https://img.shields.io/badge/Format-JSON-lightgrey.svg)](#quick-access)

**[Browse the Library →](https://devcraftxcoder.github.io/Prompt-Library/library)**

[Tier System](#tier-system) | [What's Included](#whats-included) | [Example Prompts](#example-prompts) | [Quick Access](#quick-access)

</div>

---

## Overview

Prompt Library is a structured collection of 3,900+ production-tested AI prompts organized across 6 sections and multiple domains. Each prompt is categorized by tier (Quick / Combo / Paragraph), model compatibility, and domain — so you always know what you're picking up before you use it.

Built for developers, security practitioners, and AI workflow designers who need prompts that work on the first attempt.

---

## Architecture

```
prompts.json
  |
  +-- section: Core
  |     +-- tier: quick   [ one-shot, direct answer ]
  |     +-- tier: combo   [ multi-step, chained context ]
  |     +-- tier: paragraph [ complete structured deliverable ]
  |
  +-- section: Build
  +-- section: Ship
  +-- section: Run & Secure
  +-- section: Know & Grow
  +-- section: Connect & People
```

Each prompt entry:

```json
{
  "id": "build-code-review-q-001",
  "title": "Edge case reviewer",
  "tier": "quick",
  "section": "Build",
  "domain": "Code Review",
  "service": "claude",
  "tags": ["code-quality", "typescript"],
  "prompt": "Review this function for edge cases and return a bullet list of issues only."
}
```

---

## Tier System

### Quick

One-shot prompts that resolve in a single AI response. Use when you need a direct answer, a concise list, or a short transformation.

- Output: 1–3 sentences or a bullet list
- No prior context required
- Drop into any AI client as-is

### Combo

Multi-step prompts designed to chain across a workflow. Each step references the output of the previous one.

- Output: structured intermediate artifact consumed by the next prompt
- Optimized for multi-turn sessions and agent handoffs

### Paragraph

Prompts that generate complete, standalone deliverables — full reports, architecture proposals, implementation plans, security assessments.

- Output: 200–2000 words with headers
- Self-contained — no prior context needed

---

## What's Included

3,900+ prompts across 6 sections:

### Core
Foundational prompts applicable across all domains — summarization, clarification, assumption extraction, stakeholder translation.

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

## Quick Access

Pull the full library locally — no git history, no install:

```bash
pnpm dlx degit DevCraftXCoder/Prompt-Library prompt-library
```

Fetch the raw JSON (3,900+ prompts):

```bash
curl -s https://raw.githubusercontent.com/DevCraftXCoder/Prompt-Library/master/prompts.json | head -c 2000
```

---

## Recent Additions

- **3,900+ prompts** — library grown from 1,000 to 3,900+ entries across all sections
- **Clean URLs** — library now served at `/library` (no `.html` extension)
- **cmdk search shell** — ⌘K hotkey, prompt-type taxonomy tabs, featured prompts row, card metadata
- **Model mode toggle** — switch between Standard and High-quality preamble per copy
- **25 product launch / social media prompts** — Product Hunt, Reddit, LinkedIn, Twitter/X, HN launch copy, cold DMs, founder story templates
- **Domain pill filters** — one-click filter by Engineering, Agents, Security, Data

---

## Contributing

All contributions must follow the tier structure. Submit new prompts with:

- `id`: `{section}-{domain}-{tier-initial}-{sequence}` (e.g. `build-debug-q-042`)
- `tier`: `quick`, `combo`, or `paragraph`
- `section`: one of the 6 sections listed above
- `domain`: sub-domain within the section
- `tags`: 1–3 lowercase kebab-case tags
- `prompt`: the prompt text — user-turn only, no embedded system instructions

Test each prompt against at least one AI client before submitting. Prompts that produce inconsistent output across runs are not accepted.

---

## License

MIT License. Copyright 2026 DevCraftXCoder. See [LICENSE](LICENSE).
