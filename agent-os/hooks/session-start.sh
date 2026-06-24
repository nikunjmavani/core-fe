#!/usr/bin/env bash
# Claude Code SessionStart hook for core-fe (self-contained — no other repo).
#
# Two jobs:
#   1. (web) Make the env usable: verify Node, switch to a new-enough Node when
#      needed (pinned for the session via $CLAUDE_ENV_FILE), and install deps so
#      `pnpm health` / tests / linters work.
#   2. Inject session context: the agent-os skill-routing map plus a short
#      env/commands summary, as SessionStart additionalContext.
#
#   stderr -> install logs / diagnostics (NOT added to context)
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT" || exit 0

# --- Required Node major (from .nvmrc, fallback 24) --------------------------
required_major="24"
if [ -f .nvmrc ]; then
  parsed="$(tr -dc '0-9.' < .nvmrc | cut -d. -f1)"
  [ -n "$parsed" ] && required_major="$parsed"
fi
current_major="$(node -v 2>/dev/null | tr -dc '0-9.' | cut -d. -f1)"
[ -z "$current_major" ] && current_major="0"
node_ok="yes"; [ "$current_major" -lt "$required_major" ] 2>/dev/null && node_ok="no"

# --- If Node is too old, find a new-enough one and pin it for the session ----
if [ "$node_ok" = "no" ]; then
  for candidate in \
    "/opt/node${required_major}/bin" \
    /opt/node"${required_major}"*/bin \
    "${HOME}/.nvm/versions/node/v${required_major}"*/bin \
    /usr/local/node"${required_major}"*/bin; do
    [ -x "${candidate}/node" ] || continue
    cand_major="$("${candidate}/node" -v 2>/dev/null | tr -dc '0-9.' | cut -d. -f1)"
    if [ -n "$cand_major" ] && [ "$cand_major" -ge "$required_major" ] 2>/dev/null; then
      export PATH="${candidate}:${PATH}"
      [ -n "${CLAUDE_ENV_FILE:-}" ] && printf 'export PATH=%s:$PATH\n' "$candidate" >> "$CLAUDE_ENV_FILE"
      current_major="$cand_major"; node_ok="yes"
      echo "session-start: switched to $(node -v) at ${candidate} (persisted for the session)." >&2
      break
    fi
  done
fi

# --- Install deps on remote (web) sessions when Node is adequate -------------
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if [ "$node_ok" = "no" ]; then
    echo "session-start: Node $(node -v 2>/dev/null) is below required v${required_major} (.nvmrc) — skipping pnpm install." >&2
  elif [ ! -x node_modules/.bin/vite ]; then
    echo "session-start: installing dependencies (pnpm install)…" >&2
    corepack enable >/dev/null 2>&1 || true
    pnpm install --prefer-offline >&2 || pnpm install >&2 || echo "session-start: pnpm install failed (see log above)." >&2
  else
    echo "session-start: dependencies already present — skipping install." >&2
  fi
fi

# --- MCP config: scaffold the local config from the committed template -------
# `.mcp.json` is a tracked symlink → agent-os/mcp/mcp.json (gitignored, holds the
# Context7 key). When the real file is absent, scaffold it from the secret-free
# mcp.example.json so servers are declared; the Context7 key still needs filling
# in (see agent-os/docs/cursor-mcp-setup.md). Best-effort, fail-open.
mcp_status="n/a"
if [ -f agent-os/mcp/mcp.json ]; then
  if command -v jq >/dev/null 2>&1; then
    mcp_status="$(jq -r '.mcpServers | keys | length' agent-os/mcp/mcp.json 2>/dev/null || echo '?') declared"
  else
    mcp_status="declared"
  fi
elif [ -f agent-os/mcp/mcp.example.json ]; then
  if cp agent-os/mcp/mcp.example.json agent-os/mcp/mcp.json 2>/dev/null; then
    mcp_status="scaffolded from template (set your Context7 key)"
    echo "session-start: scaffolded agent-os/mcp/mcp.json from mcp.example.json — set YOUR_CONTEXT7_API_KEY (agent-os/docs/cursor-mcp-setup.md)." >&2
  else
    mcp_status="template only (cp agent-os/mcp/mcp.example.json agent-os/mcp/mcp.json)"
  fi
fi

# --- Build session context: env summary + skill routing map ------------------
node_version="$(node -v 2>/dev/null || echo unknown)"
deps="missing"; [ -x node_modules/.bin/vite ] && deps="installed"
gh_cli="absent"; command -v gh >/dev/null 2>&1 && gh_cli="$(gh --version 2>/dev/null | head -1 | awk '{print $3}')"
[ -n "$gh_cli" ] || gh_cli="absent"
gitleaks_status="absent"; command -v gitleaks >/dev/null 2>&1 && gitleaks_status="present"
provisioned="no"; { [ "$node_ok" = "yes" ] && [ "$deps" = "installed" ]; } && provisioned="yes"
node_note=""; [ "$node_ok" = "no" ] && node_note="  (switch to Node >=${required_major} from .nvmrc, then pnpm install)"

map_file="$ROOT/agent-os/docs/skill-triggers.md"
map_section=""
[ -f "$map_file" ] && map_section="$(cat "$map_file")"

context="$(printf 'core-fe session ready — environment provisioned: %s.\n- Node %s (need >=%s) · deps %s · gh %s · mcp %s · gitleaks %s%s\n- Dev: pnpm dev (Vite :5173, mock API). Gates: pnpm health (all phases) · pnpm tsc · pnpm lint · pnpm validate:tokens · pnpm validate:structure · pnpm test\n- Skill-first: consult agent-os/skills/skill-registry/SKILL.md, then the listed skill(s) for the files you change.\n\n%s' \
  "$provisioned" "$node_version" "$required_major" "$deps" "$gh_cli" "$mcp_status" "$gitleaks_status" "$node_note" "$map_section")"

# Prefer the structured additionalContext envelope; fall back to plain stdout
# (also injected as context) when jq is unavailable. Fail-open either way.
if command -v jq >/dev/null 2>&1; then
  jq -cn --arg c "$context" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
else
  printf '%s\n' "$context"
fi
