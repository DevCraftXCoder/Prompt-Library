'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const cache  = require('./cache.cjs');
const search = require('./search.cjs');

// ─── Paths ───────────────────────────────────────────────────────────────────
const KITS_DIR       = path.join(os.homedir(), '.claude', 'cache', 'paste', 'kits');
const TELEMETRY_PATH = path.join(os.homedir(), '.claude', 'cache', 'paste', 'telemetry.jsonl');

// ─── Session state (in-memory, resets on server restart) ─────────────────────
const _history = []; // [{ id, title, domain, type, mode, ts }] — cap 20

// ─── Telemetry (append-only, silent failure) ─────────────────────────────────
function appendTelemetry(tool, latency_ms, result) {
  try {
    const isError    = result?.isError === true;
    const resultText = result?.content?.[0]?.text || '';
    const lineCount  = (resultText.match(/\n/g) || []).length;
    const line       = JSON.stringify({ ts: new Date().toISOString(), tool, latency_ms, lines: lineCount, error: isError }) + '\n';
    fs.appendFileSync(TELEMETRY_PATH, line);
  } catch {}
}

// ─── Diff utility (LCS-based line diff, max 200 lines each side) ──────────────
function lineDiff(a, b) {
  const la = a.split('\n').slice(0, 200);
  const lb = b.split('\n').slice(0, 200);
  const m  = la.length, n = lb.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = la[i-1] === lb[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result = []; let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && la[i-1] === lb[j-1])                   { result.unshift({ t: ' ', l: la[i-1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j]))     { result.unshift({ t: '+', l: lb[j-1] }); j--;      }
    else                                                            { result.unshift({ t: '-', l: la[i-1] }); i--;      }
  }
  return result;
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'paste', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: 'paste_search',
    description: 'Search the Paste prompt library by keyword. Uses BM25F full-body ranking across title, domain, section, prompt_short, and full prompt text. Includes fuzzy fallback for typos.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query — supports multi-word, fuzzy matching on typos' },
        limit: { type: 'number', description: 'Max results (default: 5, max: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'paste_use',
    description: 'Get a specific prompt by its ID. Returns the prompt text in the requested mode. Tracked in session history.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Prompt ID (e.g. "featured-adversarial-code-reviewer")' },
        mode: {
          type: 'string',
          enum: ['full', 'short', 'filtered'],
          description: 'Which prompt variant to return (default: short). Falls back to full if short/filtered not available.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'paste_featured',
    description: 'Get the curated featured prompts from the library.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'paste_random',
    description: 'Get a quality-biased random prompt (featured × 3 weight, log-scale stars). Optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        type:    { type: 'string', enum: ['agent', 'flow', 'system', 'prompt'] },
        service: { type: 'string', enum: ['claude', 'codex', 'gemini'] },
        domain:  { type: 'string', description: 'Domain name (case-insensitive, e.g. "Security")' },
        tier:    { type: 'string', enum: ['full', 'quick', 'combo', 'paragraph'] },
      },
    },
  },
  {
    name: 'paste_browse',
    description: 'Browse prompts filtered by domain, tier, service, or type. Optional sort.',
    inputSchema: {
      type: 'object',
      properties: {
        domain:  { type: 'string' },
        tier:    { type: 'string', enum: ['full', 'quick', 'combo', 'paragraph'] },
        service: { type: 'string', enum: ['claude', 'codex', 'gemini'] },
        type:    { type: 'string', enum: ['agent', 'flow', 'system', 'prompt'] },
        limit:   { type: 'number', description: 'Max results to show (default: 10, max: 25)' },
        sort:    { type: 'string', enum: ['stars', 'version', 'featured'], description: 'Sort order (default: library order)' },
      },
    },
  },
  {
    name: 'paste_stats',
    description: 'Get library statistics: total count, breakdown by type/service/tier/domain.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'paste_copy',
    description: 'Get the raw prompt text for a given ID, ready to copy to clipboard.',
    inputSchema: {
      type: 'object',
      properties: {
        id:   { type: 'string', description: 'Prompt ID' },
        mode: { type: 'string', enum: ['full', 'short', 'filtered'], description: 'Which variant to copy (default: full)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'paste_history',
    description: 'List prompts injected via paste_use in this session, most recent first. Resets on server restart.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max entries (default: 10, max: 20)' },
      },
    },
  },
  {
    name: 'paste_compose',
    description: 'Chain two prompts into one composite block (e.g. system + agent). Returns a formatted multi-section prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        id1:       { type: 'string', description: 'First prompt ID (typically system or flow)' },
        id2:       { type: 'string', description: 'Second prompt ID (typically agent or prompt)' },
        mode:      { type: 'string', enum: ['full', 'short', 'filtered'], description: 'Variant for both prompts (default: short)' },
        separator: { type: 'string', description: 'Text separator between blocks (default: "---AGENT START---")' },
      },
      required: ['id1', 'id2'],
    },
  },
  {
    name: 'paste_diff',
    description: 'Show a line diff between two prompts. Useful for comparing similar entries or prompt versions.',
    inputSchema: {
      type: 'object',
      properties: {
        id1:  { type: 'string', description: 'Base prompt ID' },
        id2:  { type: 'string', description: 'Comparison prompt ID' },
        mode: { type: 'string', enum: ['full', 'short', 'filtered'], description: 'Which variant to diff (default: short)' },
      },
      required: ['id1', 'id2'],
    },
  },
  {
    name: 'paste_export',
    description: 'Save a set of prompts to a kit file at ~/.claude/cache/paste/kits/<name>.json.',
    inputSchema: {
      type: 'object',
      properties: {
        ids:  { type: 'array', items: { type: 'string' }, description: 'Prompt IDs to include' },
        name: { type: 'string', description: 'Kit filename without extension (default: kit-<timestamp>)' },
        mode: { type: 'string', enum: ['full', 'short', 'filtered'], description: 'Which variant to save (default: full)' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'paste_help',
    description: 'Show all available paste tools and filter options.',
    inputSchema: { type: 'object', properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ─── Request handler — telemetry wrapper ─────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const t0 = Date.now();
  let result;
  try {
    const prompts = await cache.get();
    result = await handleTool(name, args, prompts);
  } catch (e) {
    result = err(`Internal error: ${e.message}`);
  }
  appendTelemetry(name, Date.now() - t0, result);
  return result;
});

// ─── Tool handlers ────────────────────────────────────────────────────────────
async function handleTool(name, args, prompts) {
  switch (name) {

    case 'paste_search': {
      if (!args.query || typeof args.query !== 'string' || !args.query.trim())
        return err('query is required and must be a non-empty string.');
      const limit   = Math.min(args.limit || 5, 20);
      const results = search.query(prompts, args.query.trim(), limit);
      if (!results.length) return text(`No results for "${args.query}". Try a broader term or use paste_browse.`);
      const rows = results.map(
        (p, i) => `${i + 1}. **${p.title}** (\`${p.id}\`) · ${p.domain || '—'} · /${p.type} · ${p.tier} · ★${fmt(p.stars)}`
      );
      return text(`Found ${results.length} result(s) for "${args.query}":\n\n` + rows.join('\n'));
    }

    case 'paste_use': {
      if (!args.id || typeof args.id !== 'string') return err('id is required.');
      const p = prompts.find(x => x.id === args.id.trim());
      if (!p) return err(`Prompt not found: \`${args.id}\`\n\nUse paste_search to find the right ID.`);
      const mode      = args.mode || 'short';
      const body      = resolveContent(p, mode);
      const modeLabel = body === p.prompt ? 'full' : mode;
      _history.unshift({ id: p.id, title: p.title, domain: p.domain || '—', type: p.type, mode: modeLabel, ts: new Date().toISOString() });
      if (_history.length > 20) _history.pop();
      return text(
        `---\n**[paste] ${p.title}** · ${p.domain || '—'} · /${p.type} · ${p.version} · ★${fmt(p.stars)} · [${modeLabel}]\n\n${body}\n---`
      );
    }

    case 'paste_featured': {
      const featured = prompts.filter(p => p.featured);
      if (!featured.length) return text('No featured prompts found.');
      const rows = featured.map(
        (p, i) =>
          `${i + 1}. ${p.icon || '⭐'} **${p.title}** · ${p.domain || '—'} · /${p.type} · ${p.version} · ★${fmt(p.stars)}\n   \`paste_use(id="${p.id}")\``
      );
      return text(`**Featured Prompts** (${featured.length} curated)\n\n` + rows.join('\n\n'));
    }

    case 'paste_random': {
      const filters = pick(args, ['type', 'service', 'domain', 'tier']);
      const p       = search.random(prompts, filters);
      if (!p) return err('No prompts match those filters. Try broadening or removing some filters.');
      const snippet = resolveContent(p, 'short').slice(0, 250);
      return text(
        `🎲 **${p.title}** (\`${p.id}\`)\n${p.domain || '—'} · /${p.type} · ${p.tier} · ★${fmt(p.stars)}\n\n${snippet}${snippet.length >= 250 ? '…' : ''}\n\nUse \`paste_use(id="${p.id}")\` to get the full prompt.`
      );
    }

    case 'paste_browse': {
      const filters = pick(args, ['type', 'service', 'domain', 'tier']);
      const limit   = Math.min(args.limit || 10, 25);
      const all     = search.filterAndSort(prompts, filters, args.sort || null);
      const results = all.slice(0, limit);
      if (!results.length) return err('No prompts match those filters.');
      const rows = results.map(
        (p, i) => `${i + 1}. **${p.title}** (\`${p.id}\`) · /${p.type} · ${p.tier} · ★${fmt(p.stars)}`
      );
      const header = `Showing ${results.length} of ${all.length} matching prompts:\n\n`;
      const footer = all.length > limit ? `\n\nUse limit up to 25, or add filters to narrow results.` : '';
      return text(header + rows.join('\n') + footer);
    }

    case 'paste_stats': {
      const byType = {}, bySvc = {}, byTier = {}, byDomain = {};
      prompts.forEach(p => {
        byType[p.type]    = (byType[p.type] || 0) + 1;
        bySvc[p.service]  = (bySvc[p.service] || 0) + 1;
        byTier[p.tier]    = (byTier[p.tier] || 0) + 1;
        if (p.domain) byDomain[p.domain] = (byDomain[p.domain] || 0) + 1;
      });
      const topDomains = Object.entries(byDomain)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([k, v]) => `  ${k}: ${v}`).join('\n');
      return text(
        `**Paste Library Stats**\nTotal: ${prompts.length} prompts\n\nBy type:\n${fmtObj(byType)}\n\nBy service:\n${fmtObj(bySvc)}\n\nBy tier:\n${fmtObj(byTier)}\n\nTop 10 domains:\n${topDomains}\n\nFeatured: ${prompts.filter(p => p.featured).length}`
      );
    }

    case 'paste_copy': {
      if (!args.id || typeof args.id !== 'string') return err('id is required.');
      const p = prompts.find(x => x.id === args.id.trim());
      if (!p) return err(`Prompt not found: \`${args.id}\``);
      const body = resolveContent(p, args.mode || 'full');
      return text(
        `**[paste] ${p.title}** (copy-ready)\n\nRaw prompt text:\n\n\`\`\`\n${body}\n\`\`\`\n\nTo copy on your OS:\n- **Windows:** paste into terminal and pipe to \`clip\`\n- **macOS:** pipe to \`pbcopy\`\n- **Linux:** pipe to \`xclip -selection clipboard\``
      );
    }

    case 'paste_history': {
      const limit   = Math.min(args.limit || 10, 20);
      const entries = _history.slice(0, limit);
      if (!entries.length) return text('No prompts used in this session yet.');
      const rows = entries.map(
        (e, i) => `${i + 1}. **${e.title}** (\`${e.id}\`) · ${e.domain} · /${e.type} · [${e.mode}] · ${e.ts.slice(11, 16)} UTC`
      );
      return text(`**Session History** (${entries.length} used)\n\n` + rows.join('\n'));
    }

    case 'paste_compose': {
      if (!args.id1 || !args.id2) return err('id1 and id2 are required.');
      const p1 = prompts.find(x => x.id === args.id1.trim());
      const p2 = prompts.find(x => x.id === args.id2.trim());
      if (!p1) return err(`Prompt not found: \`${args.id1}\``);
      if (!p2) return err(`Prompt not found: \`${args.id2}\``);
      const mode = args.mode || 'short';
      const sep  = args.separator || '---AGENT START---';
      const b1   = resolveContent(p1, mode);
      const b2   = resolveContent(p2, mode);
      return text(
        `---\n**[paste:compose]** ${p1.title} + ${p2.title}\n\n` +
        `## System / Context\n${b1}\n\n${sep}\n\n## Agent Instructions\n${b2}\n---`
      );
    }

    case 'paste_diff': {
      if (!args.id1 || !args.id2) return err('id1 and id2 are required.');
      const p1 = prompts.find(x => x.id === args.id1.trim());
      const p2 = prompts.find(x => x.id === args.id2.trim());
      if (!p1) return err(`Prompt not found: \`${args.id1}\``);
      if (!p2) return err(`Prompt not found: \`${args.id2}\``);
      const mode = args.mode || 'short';
      const a    = resolveContent(p1, mode);
      const b    = resolveContent(p2, mode);
      if (a === b) return text(`No differences — both prompts have identical ${mode} content.`);
      const diff    = lineDiff(a, b);
      const removed = diff.filter(l => l.t === '-').length;
      const added   = diff.filter(l => l.t === '+').length;
      const shown   = diff.slice(0, 80);
      const trunc   = diff.length > 80;
      const lines   = shown.map(l => `${l.t} ${l.l}`).join('\n');
      const header  = `--- ${p1.title}  [v${p1.version}]\n+++ ${p2.title}  [v${p2.version}]\n@@ -${removed} lines, +${added} lines @@`;
      const footer  = trunc ? `\n\n(truncated — ${diff.length - 80} more lines)` : '';
      return text(`\`\`\`diff\n${header}\n\n${lines}${footer}\n\`\`\``);
    }

    case 'paste_export': {
      if (!Array.isArray(args.ids) || !args.ids.length) return err('ids must be a non-empty array.');
      const mode     = args.mode || 'full';
      const resolved = [];
      const missing  = [];
      for (const id of args.ids) {
        const p = prompts.find(x => x.id === String(id).trim());
        if (!p) { missing.push(id); continue; }
        resolved.push({
          id: p.id, title: p.title, domain: p.domain || '', type: p.type,
          tier: p.tier, version: p.version, stars: p.stars || 0,
          prompt: resolveContent(p, mode),
        });
      }
      if (!resolved.length) return err(`No valid prompts found. Unknown IDs: ${missing.join(', ')}`);
      const kitName = ((args.name || '') || `kit-${Date.now()}`).replace(/[^a-z0-9_-]/gi, '-');
      const kitPath = path.join(KITS_DIR, `${kitName}.json`);
      const kit     = { created_at: new Date().toISOString(), count: resolved.length, mode, prompts: resolved };
      try {
        fs.mkdirSync(KITS_DIR, { recursive: true });
        fs.writeFileSync(kitPath, JSON.stringify(kit, null, 2));
      } catch (e) {
        return err(`Failed to write kit file: ${e.message}`);
      }
      const summary = resolved.map(p => `  • ${p.title} (${p.id})`).join('\n');
      const warn    = missing.length ? `\n\n⚠️ Skipped ${missing.length} unknown ID(s): ${missing.join(', ')}` : '';
      return text(`**Kit saved:** \`${kitPath}\`\n\n${resolved.length} prompt(s):\n${summary}${warn}`);
    }

    case 'paste_help': {
      return text(
        `**Paste MCP Tools** (v1.1.0)\n\n` +
        `| Tool | Purpose |\n|------|--------|\n` +
        `| paste_search    | BM25F full-body search — typo-tolerant, AND-boosted |\n` +
        `| paste_use       | Inject a prompt by ID (short/full/filtered) |\n` +
        `| paste_featured  | List the curated featured prompts |\n` +
        `| paste_random    | Quality-biased random (featured×3, log-stars weight) |\n` +
        `| paste_browse    | Filter by domain/tier/service/type; sort by stars/version/featured |\n` +
        `| paste_stats     | Library breakdown by type/service/tier |\n` +
        `| paste_copy      | Raw text for clipboard |\n` +
        `| paste_history   | Prompts used this session (session-local, resets on restart) |\n` +
        `| paste_compose   | Chain two prompts into a composite system+agent block |\n` +
        `| paste_diff      | Line diff between two prompts (LCS algorithm) |\n` +
        `| paste_export    | Save selected prompts to a kit file |\n` +
        `| paste_help      | This help text |\n\n` +
        `**Filters (combinable on paste_browse / paste_random):**\n` +
        `- type: \`agent\` \`flow\` \`system\` \`prompt\`\n` +
        `- service: \`claude\` \`codex\` \`gemini\`\n` +
        `- tier: \`full\` \`quick\` \`combo\` \`paragraph\`\n` +
        `- domain: any string (e.g. \`Security\`, \`Architecture\`, \`Data\`)\n` +
        `- sort: \`stars\` \`version\` \`featured\` (paste_browse only)\n\n` +
        `**Featured prompts:** run \`paste_featured\` for the current curated set.\n\n` +
        `**Kit files:** ~/.claude/cache/paste/kits/\n` +
        `**Telemetry:** ~/.claude/cache/paste/telemetry.jsonl`
      );
    }

    default:
      return err(`Unknown tool: ${name}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveContent(p, mode) {
  if (mode === 'filtered') return p.prompt_filtered || p.prompt_short || p.prompt || '(no content)';
  if (mode === 'full')     return p.prompt || p.prompt_short || '(no content)';
  return p.prompt_short || p.prompt || '(no content)';
}

function pick(obj, keys) {
  const out = {};
  keys.forEach(k => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function text(str) { return { content: [{ type: 'text', text: str }] }; }
function err(msg)  { return { content: [{ type: 'text', text: `⚠️ ${msg}` }], isError: true }; }

function fmt(n) {
  if (n == null) return '?';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtObj(obj) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  cache.get().catch(() => {});
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(e => {
  process.stderr.write(`[paste-mcp] Fatal: ${e.message}\n`);
  process.exit(1);
});
