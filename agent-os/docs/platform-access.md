# Agent platform access (core-fe)

All project agents, skills, rules, hooks, and MCP templates live under [`agent-os/`](../). Tool directories (`.cursor/`, `.claude/`, `.codex/`) contain **symlinks only** plus gitignored personal files.

## Layout

| Canonical source                | Used by               | Tool symlink                         |
| ------------------------------- | --------------------- | ------------------------------------ |
| `agent-os/skills/`              | Cursor, Claude, Codex | `.cursor/skills`, `.claude/skills`   |
| `agent-os/agents/`              | Cursor, Claude        | `.cursor/agents`, `.claude/agents`   |
| `agent-os/rules/`               | Cursor                | `.cursor/rules`                      |
| `agent-os/hooks/` (scripts)     | Claude                | `.claude/hooks`                      |
| `agent-os/hooks/hooks.json`     | all (via generator)   | → `platforms/{claude,cursor,codex}/` |
| `agent-os/mcp/mcp.json`         | Cursor, Claude, root  | `.cursor/mcp.json`, `.mcp.json`      |
| `agent-os/mcp/mcp.default.json` | Codex                 | → `platforms/codex/config.toml`      |

## Regenerate derived wiring

After editing `agent-os/hooks/hooks.json` or `agent-os/mcp/mcp.default.json`:

```bash
pnpm agent-os:generate
pnpm agent-os:generate:check   # fails on drift
```

## Personal / machine-local files

| File                          | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `agent-os/mcp/mcp.json`       | Live MCP config (API keys) — copy from `mcp.example.json` |
| `.claude/settings.local.json` | Claude Code permission overrides for your machine         |
| `~/.codex/config.toml`        | Codex sandbox / approval policy (outside the repo)        |

Never commit secrets. Shared team defaults belong in `agent-os/` (or `agent-os/platforms/claude/settings.json` permissions block).

## Invoke subagents

| Tool            | How                                                                              |
| --------------- | -------------------------------------------------------------------------------- |
| **Cursor**      | `@<agent-name>` in Agent mode                                                    |
| **Claude Code** | `"Read agent-os/agents/<agent-name>.md and follow the procedure"`                |
| **Codex**       | Reference by name in your prompt; skills auto-discovered from `agent-os/skills/` |

See [`agents/README.md`](../agents/README.md) for the local catalog.
