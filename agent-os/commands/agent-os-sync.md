---
description: Regenerate agent-os adapters from common and fix any drift
allowed-tools: Bash(pnpm agent-os*)
---

Keep the agent-os bundle in sync after editing skills, rules, agents, hooks, or the registry:

1. Regenerate per-agent wiring: `pnpm agent-os:generate`
2. Integrity gate: `pnpm agent-os:check`
3. Routing gate: `pnpm agent-os:triggers:strict`
4. Drift gate: `pnpm agent-os:generate:check` — must report in-sync.
