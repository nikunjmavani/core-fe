# Agents catalog (core-fe)

The autonomous agents defined under [`agent-os/agents/`](../agents/) and shared
across Cursor and Claude Code via the `.cursor/agents/` and `.claude/agents/`
symlinks. Agents are read-only validators/investigators — for task instructions
(how to build something) see [`agent-os/skills/`](../skills/) and the
[skill registry](../skills/skill-registry/SKILL.md).

## Catalog

| Agent                  | Purpose                                                                                                                         | Tools (read-only)      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ci-investigator`      | Diagnoses a single failing PR CI check and returns a short root-cause summary with a fix plan.                                  | Read, Grep, Glob, Bash |
| `verifier`             | Skeptical independent validator — runs health/tests, checks edge cases, reports pass vs incomplete after a task is marked done. | Read, Grep, Glob, Bash |
| `docs-auditor`         | Audits `docs/` for index completeness, naming, Mermaid, and cross-links after large doc changes.                                | Read, Grep, Glob, Bash |
| `dependency-auditor`   | Runs `pnpm deps:audit` + lockfile/license/bundle-impact analysis and returns a prioritized fix plan.                            | Read, Grep, Glob, Bash |
| `bundle-size-reviewer` | Reviews build output for bundle-size regressions, broken code-splitting, and heavy first-paint imports against size budgets.    | Read, Grep, Glob, Bash |

## When to use which

- **CI is red** → `ci-investigator` (one check at a time → root cause + fix plan).
- **"Is this actually done?"** → `verifier` before claiming a feature complete.
- **Large doc change / doc review** → `docs-auditor`.
- **Before a release/deploy** → `dependency-auditor` + `bundle-size-reviewer` (the `prod-readiness` pipeline).

## Conventions

- Each agent is a Markdown file with frontmatter (`name`, `description`,
  optional `model`, `tools`, `readonly`). Shape and discovery rules:
  [`agent-os/agents/README.md`](../agents/README.md).
- All are `readonly: true` — they investigate and report; they do not
  modify the working tree. `check.ts` enforces this: a `readonly` agent must
  declare a `tools` allowlist that excludes every write tool.
- Author once under `agent-os/agents/`; both Cursor and Claude pick them up via
  symlink.

## Review pipelines

Named sequences of these read-only agents live in
[`agent-os/agents/pipelines.json`](../agents/pipelines.json) — the source of
truth for what the [`/pre-merge-review`](../commands/pre-merge-review.md)
command runs. The `pre-merge-review` pipeline fans out `verifier` →
`docs-auditor` and aggregates one prioritized report; each step's `handoff`
names the skill that fixes its findings (`verifier → test-generation`,
`docs-auditor → documentation-maintenance`). The
[`/prod-readiness`](../commands/prod-readiness.md) command runs the
`prod-readiness` pipeline — `dependency-auditor` → `bundle-size-reviewer` before
a release/deploy
(`dependency-auditor → code-quality-security`,
`bundle-size-reviewer → platform-hygiene`). `check.ts` gates the manifest —
every step resolves to an agent file and every handoff to a skill directory.

## Adding an agent

1. Drop `<agent-name>.md` into [`agent-os/agents/`](../agents/).
2. Wire it into [`agent-os/rules/skill-router.mdc`](../rules/skill-router.mdc) if
   it belongs to a task pipeline.
3. Add a row to the catalog above.

## Related

- Skills: [`agent-os/skills/`](../skills/) · [skill registry](../skills/skill-registry/SKILL.md)
- Platform wiring: [platform-access.md](platform-access.md)
- Commands: [`agent-os/commands/README.md`](../commands/README.md)
