---
name: bundle-performance
description: Keep the core-fe production bundle within size-limit budgets — dynamic-import heavy or deferred modules off the first-paint path, lazy route-island boundaries, code-splitting, and heavy-import triage. Use when acting on a bundle-size-reviewer finding or when a size budget is exceeded.
---

# Bundle performance

The procedural counterpart to the `bundle-size-reviewer` agent: the agent finds,
this skill fixes. Use it when a size budget is exceeded or a chunk regresses.

## Measure first

`pnpm build` then `pnpm size` (size-limit budgets, `tooling/ci/run-size-limit.mjs`);
`pnpm size:check` emits JSON for before/after comparison. Never measure on the
dev server — see `docs/reference/local-production-perf.md`.

## The main levers

1. **Dynamic-import heavy / deferred modules.** `@sentry/react`, `posthog-js`,
   and the SettingsModal / CommandPalette trees must be `import()`-only — a
   single static import drags their chunk onto the first-paint preload path.
   `pnpm build:check` tripwires this; keep them lazy.
2. **Lazy route islands.** Every route loads via its `<page>.route.tsx` lazy
   boundary; a route that becomes eagerly imported merges into the entry chunk.
   Keep the boundary intact.
3. **Split vendor from entry.** A large new dependency added to a shared,
   eagerly-loaded module inflates the entry. Import it in the leaf that needs
   it, or dynamic-import it; reconsider the dependency (see
   `agent-os/skills/dependency-management/SKILL.md`).
4. **CSP constraint.** `assetsInlineLimit: 0` in `vite.config.ts` is required for
   CSP — do not inline assets to shave requests.

## Verify

- `pnpm size` — every budget within limit.
- `pnpm build:check` — no heavy deferred module on the first-paint path.

## Related

Skills: `platform-hygiene` (build env, knip, deploy validators),
`react-best-practices` (re-render / code-split patterns),
`dependency-management` (dependency size). Agent: `bundle-size-reviewer`
(read-only finder). Doc: `docs/reference/local-production-perf.md`.
