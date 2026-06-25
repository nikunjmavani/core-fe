# core-fe skill triggers

The file→skill routing map the agent hooks consult (session-start,
prompt-skill-router, skill-reminder, stop-gate-reminder). Always consult
`agent-os/skills/skill-registry/SKILL.md` FIRST, then run the listed skill(s) for
the files you change. This is advisory: skills elevate craft within the
guardrails (shadcn components, semantic tokens, configured fonts/brand).

## By intent (prompt-time)

| When the task is…                              | Run skill(s)                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| a new page / route                             | `page-scaffolding` → `route-island`                                |
| a component / UI / page styling                | `shadcn` (pick + add) → `frontend-design` → `composition-patterns` |
| a form                                         | `composition-patterns` → `test-generation`                         |
| a Query hook / data layer (`*.api.ts`, hooks/) | `react-best-practices` (api-data-patterns rule)                    |
| styling / theme / tokens / Tailwind            | `frontend-design` (tailwind-styling + ui-sources rules)            |
| tests / test ids                               | `test-generation` → `e2e-testids`                                  |
| “make it premium / beautiful”                  | `frontend-design` / `high-end-visual-design` / `impeccable`        |
| an a11y / UX review                            | `web-design-guidelines` / `ui-ux-pro-max`                          |
| docs / README / overview                       | `documentation-maintenance`                                        |
| where does this code go?                       | `code-structure` / `component-promotion`                           |
| lint / quality cleanup                         | `lint-guard` / `code-smells-best-practices`                        |
| full project check                             | `project-health-check` (`pnpm health`)                             |

## By file pattern (after an edit)

| File pattern                               | Skill(s)                                                     |
| ------------------------------------------ | ------------------------------------------------------------ |
| `**/*.route.tsx` · `**/*.manifest.ts`      | `route-island`                                               |
| `src/pages/**/`                            | `page-scaffolding`, `route-island`                           |
| `**/*.contracts.ts`                        | `code-structure`                                             |
| `**/*.api.ts` · `**/hooks/use*/**`         | `react-best-practices`                                       |
| `**/components/ui/*`                       | `shadcn`                                                     |
| `**/components/**/*.tsx` · `**/forms/**/*` | `composition-patterns`, `frontend-design`, `test-generation` |
| `src/index.css` · `**/*.css`               | `frontend-design`                                            |
| `**/*.test.ts` · `**/*.test.tsx`           | `test-generation`                                            |
| `tests/e2e/**`                             | `e2e-testids`                                                |
| `.env.example`                             | `documentation-maintenance`                                  |

## Gates (definition of done)

`pnpm health` (full check) — or individually: `pnpm tsc` · `pnpm lint` ·
`pnpm biome:check` · `pnpm format:check` · `pnpm validate:tokens` ·
`pnpm validate:structure` · `pnpm test` · `pnpm docs:lint`. Pre-push runs the
local SonarQube gate on deployed-surface changes.
