# core-fe skill triggers

The file→skill routing map the agent hooks consult (session-start,
prompt-skill-router, skill-reminder, stop-gate-reminder). Always consult
`agent-os/skills/skill-registry/SKILL.md` FIRST, then run the listed skill(s) for
the files you change. This is advisory: skills elevate craft within the
guardrails (shadcn components, semantic tokens, configured fonts/brand).

## By intent (prompt-time)

| When the task is…                              | Run skill(s)                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| a new page / route                             | `page-scaffolding` → `route-island`                              |
| a component / UI / page styling                | `shadcn` (pick + add) → `frontend-design` → `component-patterns` |
| a form                                         | `component-patterns` → `test-generation`                         |
| a Query hook / data layer (`*.api.ts`, hooks/) | `react-best-practices` (api-data-patterns rule)                  |
| styling / theme / tokens / Tailwind            | `frontend-design` (tailwind-styling + ui-sources rules)          |
| tests / test ids                               | `test-generation` → `e2e-testids`                                |
| “make it premium / beautiful”                  | `frontend-design` / `high-end-visual-design` / `impeccable`      |
| an a11y / UX review                            | `web-design-guidelines` / `ui-ux-pro-max`                        |
| docs / README / overview                       | `documentation-maintenance`                                      |
| where does this code go?                       | `code-structure` / `component-promotion`                         |
| lint / quality cleanup                         | `lint-guard` / `code-smells-best-practices`                      |
| full project check                             | `project-health-check` (`pnpm health`)                           |

## By file pattern (after an edit)

| File pattern                       | Skill(s)                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `*.route.tsx` · `*.manifest.ts`    | `route-island` (path, RBAC permission, head, children)            |
| `pages/<x>/` (new island)          | `page-scaffolding` → `route-island`                               |
| `*.contracts.ts`                   | Zod schemas + inferred types (api-data-patterns rule)             |
| `*.api.ts` · `hooks/use*/`         | `react-best-practices` (TanStack Query owns server state)         |
| `components/ui/*`                  | `shadcn` (vendored — add/compose via CLI, don’t hand-edit)        |
| `components/<X>/*.tsx` · `forms/*` | `component-patterns` + `frontend-design` + `test-generation`      |
| `src/index.css` · `*.css`          | `frontend-design` (semantic tokens only — `pnpm validate:tokens`) |
| `*.test.ts(x)`                     | `test-generation`                                                 |
| `tests/e2e/*`                      | `e2e-testids`                                                     |
| `.env.example` / env               | `documentation-maintenance` (VITE\_ = public; secrets via env)    |

## Gates (definition of done)

`pnpm health` (full check) — or individually: `pnpm tsc` · `pnpm lint` ·
`pnpm biome:check` · `pnpm format:check` · `pnpm validate:tokens` ·
`pnpm validate:structure` · `pnpm test` · `pnpm docs:lint`. Pre-push runs the
local SonarQube gate on deployed-surface changes.
