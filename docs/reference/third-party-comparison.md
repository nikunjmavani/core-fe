# Third-party dependency comparison — core-fe

Verdict summary for major libraries used in this repo. Full stack list: [tools-and-usage.md](./tools-and-usage.md).

## Charts

| Current                         | Size (gzip, approx.)             | Alternatives                           | Verdict                                                                    |
| ------------------------------- | -------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| **Recharts** via shadcn `chart` | ~40–60 KB in lazy `charts` chunk | @nivo (~110 KB), visx, Chart.js, uPlot | **KEEP** — shadcn-canonical, lazy-loaded on dashboard only. @nivo removed. |

## Animation

| Current                  | Alternatives                                     | Verdict                                                                                              |
| ------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **CSS + tw-animate-css** | framer-motion (~39 KB), motion-one, react-spring | **KEEP** — zero JS animation library; overlays use `tw-animate-css`; page fade via custom keyframes. |

## Error tracking

| Current                                   | Alternatives                            | Verdict                                                                                                               |
| ----------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **@sentry/react** (idle + dynamic import) | Rollbar, Bugsnag, OpenTelemetry browser | **KEEP** — defer init in `main.tsx`; replay/profiling only in production; separate `sentry` chunk via `manualChunks`. |

## Analytics

| Current                                | Alternatives          | Verdict                                                                   |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| **posthog-js** (idle + dynamic import) | Plausible, Umami, GA4 | **KEEP** — feature flags via `FeatureFlagProvider`; lazy `posthog` chunk. |

## Routing

| Current                    | Alternatives    | Verdict                                                                                      |
| -------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| **@tanstack/react-router** | React Router v7 | **KEEP** — typed routes, loaders, search params for table state; Sentry tracing integration. |

## Data & forms

| Library               | Alternatives          | Verdict                                                                        |
| --------------------- | --------------------- | ------------------------------------------------------------------------------ |
| @tanstack/react-table | AG Grid, MUI DataGrid | **KEEP** — headless; tablecn-style toolbar in `shared/components/data-table/`. |
| react-hook-form + zod | Formik, Final Form    | **KEEP** — split `rhf` + `zod` chunks.                                         |
| zustand               | Redux, Jotai          | **KEEP** — client/session/onboarding only.                                     |
| TanStack Query        | RTK Query, SWR        | **KEEP** — server state.                                                       |

## Skipped (not needed today)

| Library                 | Why skip                                                       |
| ----------------------- | -------------------------------------------------------------- |
| MSW                     | Tagged `REPLACE_WITH_API` mock layer + backend MCP for shapes. |
| nuqs                    | Router search params cover URL-synced tables.                  |
| axios / ky              | Intentional `fetch` client + 401 refresh queue.                |
| react-i18n              | English-in-code until product requires UI localization.        |
| Storybook               | Heavy; optional for design system later.                       |
| @tanstack/react-virtual | Add when tables exceed ~1k visible rows.                       |

## Mock API strategy

Static fixtures in `api.ts` with `// REPLACE_WITH_API: <METHOD> <path>` — swap to `apiClient` without UI changes. Contracts mirror **core-be** `/api/v1` responses.
