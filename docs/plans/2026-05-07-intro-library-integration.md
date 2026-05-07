# Plan — Integrate intro promises into the actual library

**Date:** 2026-05-07
**Repo:** `DevCraftXCoder/Prompt-Library` (live at https://devcraftxcoder.github.io/Prompt-Library)
**Files in scope:** `index.html` (intro), `library.html` (app), shared assets
**Goal:** Close every promise the intro page makes that the library page doesn't deliver. The intro markets a "Prompt OS" — the library currently feels like a separate JSON viewer. Make them one product.

---

## 1. Gap analysis (intro promise → library reality)

| # | Intro promise | Library reality | Severity |
|---|---|---|---|
| 1 | Brand "Paste · AI Prompt Workspace" with custom paste-icon SVG (clipboard + lightbulb) and grad/serif type system | Plain "Paste" h1, no logo mark | High — brand discontinuity |
| 2 | Hero search shell with `⌘K` kbd hint and rotating placeholder example ("refactor a React hook") | `🔍 Search prompts…` plain input | High — discovery affordance lost |
| 3 | Pill row: All / Claude / Codex / Gemini / **Engineering / Agents / Security / Data** | Service pills (Claude/Codex/Gemini) only; domain pills are dynamic but Engineering/Agents/Security/Data not surfaced as featured | High — taxonomy mismatch |
| 4 | Floating-card taxonomy: `/agent` `/prompt` `/flow` `/system` (4 prompt types) | No prompt-type concept exists in library data or UI | Medium — taxonomy missing |
| 5 | Featured cards carry stars **+ comments + version** ("4.9k · 312 · v2.1") | Library cards show only a star toggle | Medium — meta parity |
| 6 | "Production-grade prompts, curated" featured row above the grid | Single undifferentiated grid | Medium — no editorial layer |
| 7 | Workspace mock with `paste deploy …--target=staging` terminal + version bump | No deploy/version surface | Low — scope as v2 |
| 8 | Eyebrow chip "Open beta · v0.1 by DevCraftXCoder" | None | Low — versioning chip |
| 9 | Closing CTA "Stop pasting. Start shipping." | Just "← Intro" back link | Low — closing surface |
| 10 | Visual language: blob field bg, grid overlay, cursor glow, halo behind logo, Syne/DM Sans/JetBrains Mono | DM Sans only, flat dark `#080809`, no atmospheric layer | Medium — visual cohesion |
| 11 | "Trusted by" logo strip | None | Low — optional |
| 12 | "Start Building" CTA → `#start` (signup-style anchor) | None | Low — forward CTA |

---

## 2. Phases

Each phase is a single PR. Land in order — earlier phases are visual; later phases touch data shape.

### Phase 1 — Visual cohesion (no data changes)
Bring the intro's atmosphere to the library so they look like one app.

- Port CSS tokens from `index.html` `:root` into `library.html` (`--bg`, gradients, `--font-head: Syne`, `--font-mono: JetBrains Mono`)
- Add the same `<link>` Google Fonts load (Syne + DM Sans + JetBrains Mono)
- Reuse the **paste-icon SVG** (clipboard + lightbulb) from the intro hero in the library `#paste-logo-wrap` and the favicon
- Add the bg-field blob layer (`b1/b2/b3`) and `grid-overlay` div as fixed-position siblings to `#root`, with reduced opacity for the app context
- Add `cursor-glow` element + the same mousemove hook (lift the `#cg` block from `index.html`)
- Add the eyebrow chip `<span class="eyebrow"><span class="dot"></span> Open beta · v0.1</span>` next to `dash-title`
- Replace `dash-title` "Paste" h1 with `<h1>Paste <span class="grad">Library</span></h1>` matching the intro grad treatment

**Acceptance:** Visit `index.html`, click "Browse the library", land on `library.html` — no visual jolt, same fonts, same atmosphere.

### Phase 2 — Search parity
The intro's `⌘K` shell is the most distinctive affordance. Library must mirror it.

- Replace `.search-wrap` with the intro's `cmdk-shell` markup (icon, input, `<span class="kbd">⌘K</span>`)
- Update placeholder: `"Search prompts, workflows, agents…"` (verbatim from intro)
- Bind global `Cmd/Ctrl+K` hotkey → focus `#search-input`
- Port the rotating `cmdk-hint` ("Try: refactor a React hook" → cycles every 3s); lift `#cr` text rotation script from `index.html`
- Add `Esc` handler to clear input (matches macOS spotlight pattern)

**Acceptance:** ⌘K from anywhere on the page focuses search; placeholder matches intro; rotating hint cycles.

### Phase 3 — Pill row unification
Promote the intro's hero pills to first-class filters in the library.

- Above (or merging with) the existing `#service-pills`, render the intro's full pill set: **All · Claude · Codex · Gemini · Engineering · Agents · Security · Data**
- The first four filter `service`; the latter four filter `domain`
- Wire each pill to a single state (`activeFilter`) so they're mutually exclusive within their group, but cross-group composable (e.g. "Claude + Security")
- Match active-state styling to intro `.pill.active` (red bg, white text)
- Keep the dynamic `#domain-pills` row but **only** when "All" or a service is active — hide it when a domain pill is already selected (avoid duplication)

**Acceptance:** All 8 intro pills present, clickable, filter the grid; active state visually identical to intro.

### Phase 4 — Prompt-type taxonomy (`/agent`, `/prompt`, `/flow`, `/system`)
Introduce the type concept that the intro's float-cards already advertise.

- Add a `type` field to `prompts.json` (one of `agent | prompt | flow | system`); back-fill via heuristic:
  - "agent" → titles/descriptions containing "agent", "reviewer", "assistant", "researcher"
  - "flow" → contains "pipeline", "multi-step", "workflow", "chain"
  - "system" → contains "system prompt", "persona", "role"
  - default → "prompt"
- Render type as a tag in the card footer: `<span class="card-type-tag">/agent</span>` styled like intro's `.fc-tag`
- Add a 5th tier-tab style row OR fold into the existing tier-tabs as a parallel toggle; recommendation: re-purpose `tier-tabs` to "Type" and demote tier (full/quick/combo/paragraph) to a sort/group option
- Update `card-tier-tag` to show type (`/agent`) instead of tier — tier becomes secondary metadata

**Acceptance:** Every card shows its type tag; clicking the tab filters; counts update.

### Phase 5 — Card metadata parity (stars · comments · version)
Match the trio shown on the intro's featured cards.

- Extend `prompts.json` schema: each prompt gets `stars: number`, `comments: number`, `version: string` (default `v1.0`)
- Back-fill: stars = `id.length * 137` mod 5000, comments = `id.length * 11` mod 500, version = "v1.0" — placeholder values are fine for a personal library, but the field must exist
- Render the same three-icon row from intro `.card-meta` in the library card footer:
  - star icon + `1.4k`
  - bubble icon + `123`
  - text `v2.1`
- Reuse intro's exact SVG paths so visual matches pixel-for-pixel
- Star icon doubles as the existing star-toggle button (one component)

**Acceptance:** Each library card carries the same star/comments/version row as the intro's featured cards.

### Phase 6 — Editorial "Featured" row
The intro hero promised six featured prompts. Reflect that on the library.

- Above `#card-grid`, render a `#featured-grid` (3-column → 1-column responsive) populated from prompts where `featured: true` in JSON
- Mark 6 prompts featured (the same six the intro showcases): adversarial code reviewer, autonomous research lead, doc-grade summarizer, chain-of-thought planner, UI screenshot critique, threat model & OWASP scan
  - If those titles don't exist in `prompts.json`, **add them** (this is a personal library — these become real entries)
- Featured cards get a subtle `border:1px solid rgba(233,69,96,.25)` + a small "Featured" eyebrow

**Acceptance:** The same six cards from the intro appear at the top of the library, click-throughs scroll to detail/copy.

### Phase 7 — Footer cohesion
- At the bottom of `library.html`, add a slim CTA strip: **"Stop pasting. Start shipping."** + button → `index.html#start`
- Optional: replicate the intro's "Trusted by" logo strip (Vercel, Linear, Raycast, OpenAI, Anthropic, Cloudflare, Supabase) above it as plain text

**Acceptance:** Library has a closing surface that matches the intro's voice.

### Phase 8 — Deploy/version mock (optional, v2)
Skip for v1. If the project gains a per-prompt detail page later, port the intro's `dash-body` terminal panel.

---

## 3. Teammate assignments

| Phase | Owner | Tools |
|---|---|---|
| 1 — Visual cohesion | `frontend-expert` | Edit `library.html` <style>, copy SVG + bg-field markup |
| 2 — Search parity | `frontend-expert` | Edit `library.html` markup + script |
| 3 — Pill unification | `frontend-expert` | Edit `library.html` markup + filter logic |
| 4 — Type taxonomy | `frontend-expert` (UI) + `implementation-expert` (JSON back-fill script) | Node script over `prompts.json` |
| 5 — Card meta | `frontend-expert` + `implementation-expert` (schema) | JSON schema + UI |
| 6 — Featured row | `frontend-expert` | UI + JSON `featured: true` flag |
| 7 — Footer cohesion | `frontend-expert` | UI |
| Pre-ship | `adversarial-reviewer` | 7-pass review of full diff |
| Pre-ship | `qa-agent` | smoke: search, pills, ⌘K, copy, mobile 390px |

---

## 4. Acceptance criteria (the whole thing is "done" when…)

1. Opening `index.html` and navigating to `library.html` feels like one app — same fonts, same atmosphere, same brand mark
2. `⌘K` works on both pages and focuses search
3. Every pill named on the intro hero exists on the library and filters correctly
4. Every card shows type (`/agent`/`/prompt`/`/flow`/`/system`) + stars + comments + version
5. The six featured prompts named on the intro hero exist as real entries in `prompts.json` and surface in a Featured row at the top of the library
6. Library has a closing CTA that links back to the intro's `#start`
7. Mobile 390px: no horizontal scroll, pills wrap, cards stack
8. `qa-agent` smoke passes: search, all 8 pills, copy button, star toggle, ⌘K
9. `adversarial-reviewer` 7-pass: no broken JSON, no console errors, no missing assets

---

## 5. Out of scope

- Auth, accounts, deploy pipeline (intro's `paste.dev/workspace/…` is aspirational — keep marketing copy on `index.html` only)
- Backend / no Vercel/Cloudflare deploy work — this is GitHub Pages
- Adding new prompts beyond the six featured ones the intro names

---

## 6. Risks

- `prompts.json` is 2.7 MB — schema additions multiply across every entry. Back-fill script must be idempotent and run once.
- ⌘K conflicts with browser default in some browsers; need `e.preventDefault()` + cross-platform check (`metaKey || ctrlKey`)
- Visual cohesion depends on Google Fonts loading — add `font-display: swap` and a system fallback so library doesn't FOUC on slow connections
