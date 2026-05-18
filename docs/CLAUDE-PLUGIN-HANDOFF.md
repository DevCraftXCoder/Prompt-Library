# Paste — Claude Code Plugin Handoff

**Plugin name:** `paste`
**Tagline:** One command center for every prompt
**Live data source:** `https://devcraftxcoder.github.io/Prompt-Library/prompts.json` (3931 entries)
**Repo:** `DevCraftXCoder/Prompt-Library`
**Handoff date:** 2026-05-07
**Implementing agent:** `implementation-expert` + `frontend-expert`

---

## 1. Vision

The intro page at `https://devcraftxcoder.github.io/Prompt-Library` markets a "Prompt OS" workspace. The library page at `/library.html` is the browser app. This plugin brings that same command center **into Claude Code** — so any developer can pull production-quality prompts into their conversation with one command, without leaving the terminal.

```
$ /paste use adversarial-code-reviewer
$ /paste search "threat model owasp"
$ /paste featured
$ /paste random --type=agent
```

---

## 2. Command interface

### Primary command: `/paste`

Invoked in Claude Code as `/paste <subcommand> [args]`.

| Subcommand | Syntax | Description |
|---|---|---|
| `use` | `/paste use <id>` | Inject a specific prompt by id into the conversation |
| `search` | `/paste search <query>` | Full-text search across all 3931 prompts, return top 5 |
| `featured` | `/paste featured` | Show the 6 curated featured prompts |
| `random` | `/paste random [--type=agent\|flow\|system\|prompt] [--service=claude\|codex\|gemini]` | Random prompt matching filters |
| `browse` | `/paste browse [--domain=Security] [--tier=full]` | Browse by domain, tier, or service |
| `copy` | `/paste copy <id>` | Copy the raw prompt text to clipboard (runs `clip` on Windows, `pbcopy` on macOS) |
| `help` | `/paste help` | Print all commands + available filters |

### Command handle format

Every prompt in the library has a command handle derived from its `id`:
```
paste use <id>
```

Examples:
- `paste use featured-adversarial-code-reviewer`
- `paste use audit-1`
- `paste use sec-6`

The handle is displayed on each library card as a mono-font badge.

---

## 3. Implementation paths

### Path A — Lightweight SKILL.md (recommended for v1)

A single `SKILL.md` file that Claude reads when `/paste` is invoked. Claude performs the fetch and filtering inline using the WebFetch tool.

**File:** `~/.claude/skills/paste/SKILL.md`

```markdown
# paste — Prompt Library

Fetch and use production-quality AI prompts from the Paste library.

## Data source
https://devcraftxcoder.github.io/Prompt-Library/prompts.json

## Schema
Each entry: { id, title, service, domain, icon, tier, type, stars, comments, version, featured, prompt, prompt_short, prompt_filtered }

## On /paste use <id>
1. Fetch prompts.json
2. Find entry where entry.id === "<id>"
3. Output the prompt.prompt field verbatim, wrapped in a markdown code block
4. Then ask: "Use full prompt, short version (prompt_short), or filtered version (prompt_filtered)?"

## On /paste search <query>
1. Fetch prompts.json
2. Score each entry: title match (3pts), domain match (2pts), prompt first 200 chars match (1pt)
3. Return top 5 results as a table: id | title | domain | type | tier | stars
4. Ask user to pick one, then inject it

## On /paste featured
1. Fetch prompts.json
2. Filter entries where featured === true
3. Display as numbered list: icon title — domain (type) stars★
4. Ask user to pick by number

## On /paste random [--type=X] [--service=X]
1. Fetch prompts.json
2. Apply filters from flags
3. Pick one at random using Math.random()
4. Display the entry: show title, domain, type, version, snippet of prompt_short
5. Ask: "Use this prompt?" → if yes, inject prompt field

## On /paste browse [--domain=X] [--tier=X]
1. Fetch prompts.json
2. Filter by domain (exact match, case-insensitive) and/or tier
3. Return first 10 results as table with id, title, type, stars
4. Ask user to pick

## Injection format
When injecting a prompt, output:
---
**[paste] {title}** · {domain} · {type} · {version} · ★{stars}

{prompt field verbatim}
---

## Usage note
Always prefer prompt_short for quick tasks, prompt for full production use, prompt_filtered when the user wants to focus on one domain.
```

**Registration in `~/.claude/settings.json`:**
```json
{
  "skills": {
    "paste": {
      "description": "Paste — AI prompt library. /paste use <id>, /paste search <query>, /paste featured",
      "skillFile": "~/.claude/skills/paste/SKILL.md"
    }
  }
}
```

---

### Path B — MCP Server (recommended for v2, production)

A local Node.js MCP server that caches `prompts.json` and exposes tools Claude can call directly. Faster than re-fetching the 2.7 MB JSON on every command.

**Tech stack:** Node.js 18+, `@modelcontextprotocol/sdk`, `node-fetch`

**Exposed MCP tools:**

| Tool | Input | Output |
|---|---|---|
| `paste_search` | `{ query: string, limit?: number }` | Array of matching prompts (top N) |
| `paste_use` | `{ id: string, mode?: "full"\|"short"\|"filtered" }` | The prompt text |
| `paste_featured` | `{}` | Array of 6 featured prompts |
| `paste_random` | `{ type?: string, service?: string, domain?: string }` | One random matching prompt |
| `paste_browse` | `{ domain?: string, tier?: string, service?: string, limit?: number }` | Filtered list |
| `paste_stats` | `{}` | Library stats: total, by type, by service, by tier |

**File structure:**
```
~/.claude/plugins/paste-mcp/
  package.json
  server.cjs          ← MCP server entry
  cache.cjs           ← JSON cache (5min TTL, falls back to local copy)
  search.cjs          ← scoring engine
  prompts.local.json  ← local cache fallback (copy of prompts.json)
```

**server.cjs outline:**
```js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const cache = require('./cache.cjs');
const search = require('./search.cjs');

const server = new Server({ name: 'paste', version: '1.0.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler('tools/list', async () => ({
  tools: [
    { name: 'paste_search', description: 'Search the Paste prompt library', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
    { name: 'paste_use', description: 'Get a specific prompt by id', inputSchema: { type: 'object', properties: { id: { type: 'string' }, mode: { type: 'string', enum: ['full','short','filtered'] } }, required: ['id'] } },
    { name: 'paste_featured', description: 'Get the 6 featured prompts', inputSchema: { type: 'object', properties: {} } },
    { name: 'paste_random', description: 'Get a random prompt with optional filters', inputSchema: { type: 'object', properties: { type: { type: 'string' }, service: { type: 'string' }, domain: { type: 'string' } } } },
    { name: 'paste_browse', description: 'Browse prompts by domain, tier, or service', inputSchema: { type: 'object', properties: { domain: { type: 'string' }, tier: { type: 'string' }, service: { type: 'string' }, limit: { type: 'number' } } } },
    { name: 'paste_stats', description: 'Get library statistics', inputSchema: { type: 'object', properties: {} } }
  ]
}));

server.setRequestHandler('tools/call', async ({ params }) => {
  const prompts = await cache.get();
  switch (params.name) {
    case 'paste_search': return { content: [{ type: 'text', text: JSON.stringify(search.query(prompts, params.arguments.query, params.arguments.limit || 5)) }] };
    case 'paste_use': {
      const p = prompts.find(x => x.id === params.arguments.id);
      if (!p) return { content: [{ type: 'text', text: 'Prompt not found: ' + params.arguments.id }] };
      const mode = params.arguments.mode || 'full';
      const text = mode === 'short' ? p.prompt_short : mode === 'filtered' ? p.prompt_filtered : p.prompt;
      return { content: [{ type: 'text', text: `**[paste] ${p.title}** · ${p.domain} · /${p.type} · ${p.version} · ★${p.stars}\n\n${text}` }] };
    }
    case 'paste_featured': return { content: [{ type: 'text', text: JSON.stringify(prompts.filter(p => p.featured)) }] };
    case 'paste_random': {
      let pool = prompts;
      const a = params.arguments;
      if (a.type) pool = pool.filter(p => p.type === a.type);
      if (a.service) pool = pool.filter(p => p.service === a.service);
      if (a.domain) pool = pool.filter(p => p.domain?.toLowerCase() === a.domain.toLowerCase());
      const p = pool[Math.floor(Math.random() * pool.length)];
      return { content: [{ type: 'text', text: JSON.stringify(p) }] };
    }
    case 'paste_browse': {
      let pool = prompts;
      const a = params.arguments;
      if (a.domain) pool = pool.filter(p => p.domain?.toLowerCase() === a.domain.toLowerCase());
      if (a.tier) pool = pool.filter(p => p.tier === a.tier);
      if (a.service) pool = pool.filter(p => p.service === a.service);
      return { content: [{ type: 'text', text: JSON.stringify(pool.slice(0, a.limit || 10)) }] };
    }
    case 'paste_stats': {
      const byType = {}, bySvc = {}, byTier = {};
      prompts.forEach(p => { byType[p.type]=(byType[p.type]||0)+1; bySvc[p.service]=(bySvc[p.service]||0)+1; byTier[p.tier]=(byTier[p.tier]||0)+1; });
      return { content: [{ type: 'text', text: JSON.stringify({ total: prompts.length, byType, bySvc, byTier, featured: prompts.filter(p=>p.featured).length }) }] };
    }
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
```

**cache.cjs outline:**
```js
const SOURCE = 'https://devcraftxcoder.github.io/Prompt-Library/prompts.json';
const TTL_MS = 5 * 60 * 1000; // 5 minutes
let _cache = null, _ts = 0;

async function get() {
  if (_cache && Date.now() - _ts < TTL_MS) return _cache;
  try {
    const res = await fetch(SOURCE);
    _cache = await res.json();
    _ts = Date.now();
  } catch {
    if (!_cache) _cache = require('./prompts.local.json'); // fallback
  }
  return _cache;
}
module.exports = { get };
```

**search.cjs outline:**
```js
function score(p, q) {
  const ql = q.toLowerCase();
  let s = 0;
  if (p.title?.toLowerCase().includes(ql)) s += 3;
  if (p.domain?.toLowerCase().includes(ql)) s += 2;
  if ((p.prompt_short || '').toLowerCase().includes(ql)) s += 1;
  if ((p.prompt || '').slice(0, 300).toLowerCase().includes(ql)) s += 1;
  return s;
}

function query(prompts, q, limit = 5) {
  return prompts
    .map(p => ({ ...p, _score: score(p, q) }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score || b.stars - a.stars)
    .slice(0, limit)
    .map(({ _score, ...p }) => p);
}

module.exports = { query };
```

**Registration in `~/.claude/settings.json`:**
```json
{
  "mcpServers": {
    "paste": {
      "command": "node",
      "args": ["C:/Users/J/.claude/plugins/paste-mcp/server.cjs"],
      "env": {}
    }
  }
}
```

---

## 4. Data contract

The `prompts.json` schema (as of 2026-05-07, post-backfill):

```typescript
interface Prompt {
  id: string;            // e.g. "audit-1", "featured-adversarial-code-reviewer"
  title: string;         // Display name
  service: "claude" | "codex" | "gemini";
  domain: string;        // e.g. "Security", "Architecture", "Audit"
  icon: string;          // Emoji
  section: string;       // e.g. "Core", "Featured"
  tier: "full" | "quick" | "combo" | "paragraph";
  type: "agent" | "flow" | "system" | "prompt";  // added 2026-05-07
  stars: number;         // 200–4999, deterministic per id
  comments: number;      // 20–499, deterministic per id
  version: string;       // "v1.0", "v1.5", "v2.0", "v2.1" etc.
  featured: boolean;     // true on 6 entries only
  prompt: string;        // Full prompt (production use)
  prompt_short: string;  // Compressed version (context-window-aware)
  prompt_filtered: string; // Domain-scoped version
}
```

Total: **3931 entries** — 3885 Claude, 20 Codex, 20 Gemini. 6 featured.

---

## 5. UI integration — library.html command handles

Each card in `library.html` should display its command handle as a mono badge:

```html
<div class="card-command-handle">paste use {p.id}</div>
```

CSS:
```css
.card-command-handle{
  font-family: var(--font-mono-jb, monospace);
  font-size: 10px;
  color: #555;
  padding: 3px 8px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 4px;
  margin-top: 6px;
  cursor: copy;
  transition: color .15s, border-color .15s;
}
.card-command-handle:hover{color:#888;border-color:rgba(255,255,255,.12)}
```

On click, copy `paste use {p.id}` to clipboard (same as the existing copy flow) and show a toast: `Command copied!`

The featured section hero in `library.html` also shows a "one command center" terminal mock (aspirational, in-page):
```html
<div class="lib-terminal" aria-hidden="true">
  <span class="lt-prompt">~/paste $</span>
  <span class="lt-cmd" id="lt-rotating-cmd">paste use featured-adversarial-code-reviewer</span>
</div>
```
Rotate through the 6 featured ids every 3 seconds.

---

## 6. Build phases (for implementing agent)

| Phase | Agent | Output |
|---|---|---|
| **A — SKILL.md (Path A)** | `implementation-expert` | `~/.claude/skills/paste/SKILL.md` + register in `~/.claude/settings.json` |
| **B — MCP Server scaffold (Path B)** | `implementation-expert` | `~/.claude/plugins/paste-mcp/` with all 4 files + `package.json` |
| **C — Library UI: command handles** | `frontend-expert` | Add `.card-command-handle` to every card in `library.html` |
| **D — Library UI: terminal mock** | `frontend-expert` | Add rotating terminal mock in featured section |
| **E — Test** | `qa-agent` | `/paste featured`, `/paste search "security"`, `/paste use audit-1` — verify output format and injection |

**Build order:** A → C → D → E → B (MCP is optional v2; SKILL.md gives 80% of value immediately)

---

## 7. Example interactions

```
User: /paste featured
Claude: Here are the 6 featured prompts from the Paste library:

1. 🔍 Adversarial Code Reviewer · Code Review · /agent · v2.1 · ★4.9k
   paste use featured-adversarial-code-reviewer

2. 🔬 Autonomous Research Lead · Research · /agent · v1.4 · ★3.2k
   paste use featured-autonomous-research-lead

3. 📄 Doc-Grade Summarizer · Writing · /prompt · v3.0 · ★2.7k
   paste use featured-doc-grade-summarizer

[...3 more...]

Which would you like to use? Reply with the number.
```

```
User: /paste use featured-adversarial-code-reviewer
Claude:
---
**[paste] Adversarial Code Reviewer** · Code Review · /agent · v2.1 · ★4,900

You are an adversarial code reviewer performing a 7-pass deep audit...
[full prompt text]
---
Use full prompt, short version, or filtered version?
```

```
User: /paste search "chain of thought"
Claude: Found 3 matches:

1. Chain-of-Thought Planner · Reasoning · /flow · v2.3 · ★5.1k
   paste use featured-chain-of-thought-planner

2. Multi-Step Chain Executor · Orchestration · /flow · v1.0 · ★2.1k
   paste use orchestration-12

3. Reasoning Decomposer · Dev & AI · /prompt · v1.0 · ★1.8k
   paste use dev-ai-7

Pick one (1–3):
```

---

## 8. Acceptance criteria

- [ ] `/paste featured` returns exactly 6 entries where `featured === true`
- [ ] `/paste use <id>` returns the correct prompt verbatim (no truncation)
- [ ] `/paste search "security"` returns results ranked by relevance (title match > domain match > body match)
- [ ] `/paste random --type=agent` only returns entries with `type === "agent"`
- [ ] Command handles visible on every library card at `/library.html`
- [ ] Clicking a handle copies `paste use <id>` to clipboard + shows toast
- [ ] MCP server (Path B): JSON fetched with 5min cache, fallback to local copy on network failure
- [ ] MCP server registers cleanly in Claude Code settings (`claude mcp list` shows `paste`)

---

## 9. Known constraints

- `prompts.json` is 2.7 MB — for the SKILL.md path, Claude WebFetch loads the whole file. This works but adds ~2s latency. The MCP server's in-memory cache eliminates this after first load.
- Prompt text can be long (up to 2000+ chars for `full` tier). Always offer `prompt_short` as the default injection and `prompt` only on explicit request.
- `prompt_filtered` exists on every entry — it's the domain-scoped version useful when the user already has a Claude agent running a specific scope.
- 3885 of 3931 entries are `service: "claude"`. The `codex` and `gemini` entries are small sets — surface them explicitly in `/paste browse --service=gemini`.

---

*Handoff doc written 2026-05-07. Implement Phase A (SKILL.md) first — 30 min effort, immediate value. Phase B (MCP) is the production path.*
