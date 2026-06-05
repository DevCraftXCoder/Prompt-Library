# Paste MCP — Prompt Library in Claude Code

Bring the [Prompt Library](https://devcraftxcoder.github.io/Prompt-Library) into Claude Code as an MCP server. Search, browse, compose, and inject 3,900+ production-ready prompts without leaving your terminal.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- [Claude Code](https://docs.claude.com/claude-code) (`claude` CLI on your PATH)

## Install

Clone the library and run the installer for your OS:

```bash
git clone https://github.com/DevCraftXCoder/Prompt-Library.git
cd Prompt-Library/paste-mcp

# macOS / Linux / WSL / Git Bash
bash install.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installer runs `npm install` and registers the server with Claude Code at **user scope** (available in every project). Restart Claude Code afterward.

### Manual registration

If you prefer to wire it up yourself:

```bash
cd Prompt-Library/paste-mcp
npm install
claude mcp add --scope user paste -- node "$(pwd)/server.cjs"
```

Verify it registered:

```bash
claude mcp list   # should show: paste
```

## Usage

Once installed, Claude can call these tools directly. Ask in plain language ("search the paste library for a threat model prompt") or reference a tool:

| Tool | What it does |
|------|--------------|
| `paste_search` | BM25F full-body search, typo-tolerant |
| `paste_use` | Inject a prompt by ID (`short` / `full` / `filtered`) |
| `paste_featured` | List the curated featured prompts |
| `paste_random` | Quality-biased random prompt with optional filters |
| `paste_browse` | Filter by domain / tier / service / type |
| `paste_stats` | Library breakdown |
| `paste_copy` | Raw prompt text, ready to copy |
| `paste_history` | Prompts used this session |
| `paste_compose` | Chain two prompts into one block |
| `paste_diff` | Line diff between two prompts |
| `paste_export` | Save a set of prompts to a kit file |
| `paste_help` | Full tool + filter reference |

Example:

```
paste_search { query: "threat model owasp" }
paste_use    { id: "featured-adversarial-code-reviewer", mode: "full" }
```

## How data loads

The server fetches `prompts.json` from GitHub Pages with a 5-minute cache (conditional `ETag` requests). If the network is unavailable it falls back, in order, to:

1. the on-disk cache (`~/.claude/cache/paste/prompts.json`),
2. the in-repo `../prompts.json` (always in sync when installed via clone),
3. an optional bundled `prompts.local.json`.

## Uninstall

```bash
claude mcp remove paste
```

## License

MIT — see [../LICENSE](../LICENSE).
