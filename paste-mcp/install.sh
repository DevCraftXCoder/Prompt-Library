#!/usr/bin/env bash
# Paste MCP — installer for macOS / Linux / WSL / Git Bash
# Installs dependencies and registers the `paste` server with Claude Code (user scope).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required (>=18). Install Node.js first." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: the 'claude' CLI was not found on PATH. Install Claude Code first:" >&2
  echo "  https://docs.claude.com/claude-code" >&2
  exit 1
fi

echo "[1/2] Installing paste MCP dependencies..."
( cd "$DIR" && npm install --omit=dev --no-audit --no-fund )

echo "[2/2] Registering 'paste' with Claude Code (user scope)..."
claude mcp remove paste >/dev/null 2>&1 || true
claude mcp add --scope user paste -- node "$DIR/server.cjs"

echo
echo "Done. Restart Claude Code, then call the 'paste_help' tool to get started."
echo "Search:   paste_search { query: \"threat model\" }"
echo "Use:      paste_use { id: \"featured-adversarial-code-reviewer\" }"
