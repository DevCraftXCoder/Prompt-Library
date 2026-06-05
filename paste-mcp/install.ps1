# Paste MCP — installer for Windows (PowerShell)
# Installs dependencies and registers the `paste` server with Claude Code (user scope).
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "node is required (>=18). Install Node.js first."
  exit 1
}
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error "The 'claude' CLI was not found on PATH. Install Claude Code first: https://docs.claude.com/claude-code"
  exit 1
}

Write-Host "[1/2] Installing paste MCP dependencies..."
Push-Location $dir
npm install --omit=dev --no-audit --no-fund
Pop-Location

Write-Host "[2/2] Registering 'paste' with Claude Code (user scope)..."
claude mcp remove paste 2>$null
claude mcp add --scope user paste -- node "$dir/server.cjs"

Write-Host ""
Write-Host "Done. Restart Claude Code, then call the 'paste_help' tool to get started."
Write-Host "Search:   paste_search { query: `"threat model`" }"
Write-Host "Use:      paste_use { id: `"featured-adversarial-code-reviewer`" }"
