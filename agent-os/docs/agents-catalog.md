# Agents catalog (core-fe)

The autonomous agents defined under [`agent-os/agents/`](../agents/) and shared
across Cursor and Claude Code via the `.cursor/agents/` and `.claude/agents/`
symlinks. Agents are read-only validators/investigators — for task instructions
(how to build something) see [`agent-os/skills/`](../skills/) and the
[skill registry](../skills/skill-registry/SKILL.md).

## Catalog

| Agent             | Purpose                                                                                                                         | Tools (read-only)      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ci-investigator` | Diagnoses a single failing PR CI check and returns a short root-cause summary with a fix plan.                                  | Read, Grep, Glob, Bash |
| `verifier`        | Skeptical independent validator — runs health/tests, checks edge cases, reports pass vs incomplete after a task is marked done. | Read, Grep, Glob, Bash |
| `docs-auditor`    | Audits `docs/` for index completeness, naming, Mermaid, and cross-links after large doc changes.                                | Read, Grep, Glob, Bash |

## When to use which

- **CI is red** → `ci-investigator` (one check at a time → root cause + fix plan).
- **"Is this actually done?"** → `verifier` before claiming a feature complete.
- **Large doc change / doc review** → `docs-auditor`.

## Conventions

- Each agent is a Markdown file with frontmatter (`name`, `description`,
  optional `model`, `tools`, `readonly`). Shape and discovery rules:
  [`agent-os/agents/README.md`](../agents/README.md).
- All three are `readonly: true` — they investigate and report; they do not
  modify the working tree.
- Author once under `agent-os/agents/`; both Cursor and Claude pick them up via
  symlink.

## Adding an agent

1. Drop `<agent-name>.md` into [`agent-os/agents/`](../agents/).
2. Wire it into [`agent-os/rules/skill-router.mdc`](../rules/skill-router.mdc) if
   it belongs to a task pipeline.
3. Add a row to the catalog above.

## Related

- Skills: [`agent-os/skills/`](../skills/) · [skill registry](../skills/skill-registry/SKILL.md)
- Platform wiring: [platform-access.md](platform-access.md)
- Commands: [`agent-os/commands/README.md`](../commands/README.md)
