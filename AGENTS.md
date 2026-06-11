# AGENTS.md

Secondary entry point for AI coding agents (Codex CLI, Claude Code, etc.). For the full project conventions, read **[CLAUDE.md](CLAUDE.md)** first — it is the single source of truth.

## Agent OS layout

All agent configuration lives under **`agent-os/`** and is shared by every tool via symlinks. Edit files in `agent-os/`; the symlinks in `.cursor/` and `.claude/` resolve to the same files.

```
agent-os/
├── agents/        # Agent definitions (Cursor agents, Claude subagents)
├── skills/        # Project + installed skills (SKILL.md per directory)
├── rules/         # Always-applied rules (engineering, conventions, routing)
├── hooks/         # Agent hooks (Claude Code)
├── mcp/
│   ├── mcp.example.json   # Template — tracked
│   └── mcp.json           # Machine-local — gitignored
├── docs/          # Agent-facing docs
└── skills-lock.json       # Provenance for vendored skills (shadcn, frontend-design, ui-ux-pro-max, find-skills)
```

## Tool wiring

| Tool             | Reads from                                                | How                               |
| ---------------- | --------------------------------------------------------- | --------------------------------- |
| Cursor           | `.cursor/{agents,skills,rules,mcp.json,mcp.example.json}` | Symlinks → `agent-os/`            |
| Claude Code      | `.claude/{agents,skills,hooks}` and `CLAUDE.md`           | Symlinks → `agent-os/`            |
| MCP (root-level) | `.mcp.json`                                               | Symlink → `agent-os/mcp/mcp.json` |

## Where to start

- **Project conventions:** [CLAUDE.md](CLAUDE.md)
- **Skill router (what skill for what task):** [agent-os/rules/skill-router.mdc](agent-os/rules/skill-router.mdc)
- **Skill registry (catalog):** [agent-os/skills/skill-registry/SKILL.md](agent-os/skills/skill-registry/SKILL.md)
- **Engineering principles:** [agent-os/rules/engineering-principles.mdc](agent-os/rules/engineering-principles.mdc)
- **MCP setup:** [agent-os/docs/cursor-mcp-setup.md](agent-os/docs/cursor-mcp-setup.md)

## Adding a new agent skill or rule

1. Place the file directly in `agent-os/skills/<name>/SKILL.md` or `agent-os/rules/<name>.mdc`.
2. Wire it into [agent-os/rules/skill-router.mdc](agent-os/rules/skill-router.mdc) and [agent-os/skills/skill-registry/SKILL.md](agent-os/skills/skill-registry/SKILL.md).
3. Both Cursor and Claude pick it up automatically — no per-tool duplication.
