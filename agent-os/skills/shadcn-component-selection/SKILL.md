---
name: shadcn-component-selection
description: Research components across 20 allowed shadcn sources. On first traversal pick the single best and implement without asking; when user wants choice, present best 3 with links and ask. Do not write custom UI when a compatible option exists.
---

# Shadcn Component Selection Skill

> **Merged.** This skill has been consolidated into the single canonical shadcn skill at
> **`agent-os/skills/shadcn/SKILL.md`** (installed via `pnpm dlx skills add shadcn/ui`).
> Read that file — its **"Project rules — core-fe"** section contains the allowed-sources
> list and the selection workflow that used to live here, alongside the official
> "how to add/build/style/compose" guidance and CLI rules. The same allowed-sources
> policy is also always-applied via `agent-os/rules/ui-sources.mdc`.

## TL;DR (the same policy, in one place now)

- **One skill for shadcn:** `agent-os/skills/shadcn/SKILL.md` governs both _how_ components are
  added/written (CLI, critical rules) and _where_ a block comes from (the 20 allowed sources +
  selection flow).
- **First traversal** (initial build, no request for options): research the 20 allowed sources,
  pick the **single best** fit, and **implement directly** — don't ask. Optionally cite the source.
- **User wants choice / to change:** present the **best 3** with direct links + one-line "why",
  then ask "Which? (1, 2, or 3)".
- **Allowed sources & project context:** see `agent-os/skills/shadcn/SKILL.md` →
  "Project rules — core-fe", and `agent-os/rules/ui-sources.mdc`.

## Related

- **Single skill:** `agent-os/skills/shadcn/SKILL.md`
- **Always-applied policy:** `agent-os/rules/ui-sources.mdc`
- **Placement:** `agent-os/skills/code-structure/SKILL.md` (shared vs page-specific)
