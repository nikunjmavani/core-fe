# agent-os evals (core-fe)

Two-tier integrity gates for the shared `agent-os/` bundle.

| Tier              | Script            | Gates CI?                             |
| ----------------- | ----------------- | ------------------------------------- |
| **1 — integrity** | `check.ts`        | Yes — `pnpm agent-os:check`           |
| **2 — routing**   | `trigger-eval.ts` | Yes — `pnpm agent-os:triggers:strict` |

Also run `pnpm agent-os:generate:check` after editing `hooks/hooks.json`.

```bash
pnpm agent-os:check              # Tier 1 gate
pnpm agent-os:check:report       # Tier 1 verbose
pnpm agent-os:triggers           # Tier 2 report
pnpm agent-os:triggers:strict    # Tier 2 gate
pnpm agent-os:generate:check     # Platform wiring drift
```

Sync workflow: `agent-os/commands/agent-os-sync.md`.
