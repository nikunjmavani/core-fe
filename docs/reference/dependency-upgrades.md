# Dependency upgrades and audits

Use this as the **operational checklist** when triaging versions and security reports.

## Commands

| Command           | Purpose                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm deps:check` | Lists outdated direct dependencies (`pnpm outdated`). Exit code `1` when anything is outdated — expected during triage. |
| `pnpm deps:audit` | Reports known vulnerabilities (`pnpm audit --audit-level=high`).                                                        |
| `pnpm validate`   | Run after bumping packages: lint, type-check, unit tests.                                                               |

## Dependabot

Weekly npm updates are configured in [`.github/dependabot.yml`](../../.github/dependabot.yml), grouped **by risk** (same shape as core-be):

| Group              | Contents                       | Merge path                                                                                                                                                                                     |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm-non-major`    | patch + minor, prod + dev deps | **Approval-triggered auto-merge**: approve the PR and [`dependabot-auto-merge.yml`](../../.github/workflows/dependabot-auto-merge.yml) arms squash auto-merge; it lands when PR CI goes green. |
| `npm-major`        | major upgrades                 | Manual review + merge.                                                                                                                                                                         |
| `security-updates` | Dependabot security PRs        | Manual review + merge (prioritize per `SECURITY.md`).                                                                                                                                          |
| `actions`          | github-actions bumps           | Manual review + merge.                                                                                                                                                                         |

The approval is the manual gate — `main` requires 0 approvals (solo-maintained; an author can't approve their own PRs, but a maintainer can approve Dependabot's), so approving a low-risk group PR is the explicit opt-in signal. Failed CI on any Dependabot PR opens a triage issue via [`dependabot-ci-triage.yml`](../../.github/workflows/dependabot-ci-triage.yml). The `@tanstack/react-router` minor/major pin below is enforced via a Dependabot `ignore` rule.

**Prefer merging Dependabot PRs** over ad-hoc bumps, then run `pnpm validate` on the branch.

## Node.js (runtime)

- **`package.json` → `engines.node`:** `>=24` — **Active LTS** only (currently the **24.x** line). Do not target odd/current non-LTS releases for CI or deploy defaults.
- **`.nvmrc` / `.node-version`:** major `24` — use `nvm install` / your version manager so local patch versions stay on that LTS line.

## pnpm overrides (transitive CVEs)

[`package.json`](../../package.json) defines `pnpm.overrides` to force patched versions where upstream has not yet bumped:

| Override                          | Why                                                                                                                                                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protobufjs` **7.6.4**            | `posthog-js` → OpenTelemetry OTLP stack pulls it transitively (tree-shaken out of the shipped bundle). Pinned past the `<=7.5.7` unbounded-recursion DoS advisory; raise on the same 7.x line as new advisories land.                                                                   |
| `basic-ftp` **5.3.1**             | `@size-limit/preset-app` → puppeteer → `get-uri` pulled older `basic-ftp` (path traversal / DoS advisories).                                                                                                                                                                            |
| `minimatch` **10.2.5**            | `eslint-plugin-sonarjs` v3 pulled vulnerable `minimatch@10.1.x` (ReDoS). **v4** of the plugin is now direct; override keeps the tree on a patched line.                                                                                                                                 |
| `@opentelemetry/core` **>=2.8.0** | `netlify-cli` → `@netlify/blobs` → `@netlify/otel` pulled `@opentelemetry/core@2.7.1`, hit by GHSA-8988-4f7v-96qf (unbounded memory allocation). Dev/deploy CLI only — never shipped to clients — and below the `--audit-level=high` gate, so this is a floor rather than an exact pin. |

Revisit these when Dependabot or direct dependency upgrades remove the need.

## Pins and known constraints

- **`@tanstack/react-router`** is pinned to the **1.160.x** line (`~1.160.0` in [`package.json`](../../package.json)). Newer **1.169+** minors caused unhandled navigation rejections and maximum update depth in guard tests; revisit in a dedicated spike before widening the range.
- **React 19**, **Vite 8**, **ESLint 10**, **lucide-react 1.x**, and similar **majors** are intentionally **not** part of routine bumps — schedule separately with full `pnpm validate` and E2E. **`netlify-cli`** is kept current on the **v26** line (dev-only CLI).

## Audit noise

`pnpm audit --audit-level=high` should report **no high/critical** after overrides; **moderate** issues may remain in dev-only trees. Treat **production `dependencies`** first; document accepted risk for dev-only transitives if no patched upgrade exists yet.

## Upgrade decisions log

### React 19 + React Compiler (2026-06-12) — ADOPTED

- `react`/`react-dom` 18.3 → 19.2 with `@types/react*` 19: **zero** type or
  test changes needed (plain-function components, no `forwardRef`, strict
  types throughout made the codebase forward-compatible).
- **React Compiler** enabled in `vite.config.ts` via
  `babel-plugin-react-compiler` — automatic memoization at build time;
  verified active (`useMemoCache` present in the production bundle). The
  `eslint-plugin-react-hooks` v7 rules already lint for compiler
  compatibility (`react-hooks/incompatible-library` warnings on TanStack
  Table test harnesses are expected — those components skip compilation).
- **Deliberately NOT enabled in `vitest.config.ts`**: the compiler's
  synthetic memo-cache checks tripled the branch denominator
  (1,240 → 3,750) and made the coverage ratchet measure compiler internals
  instead of source. Unit coverage stays on source semantics; compiled
  output is exercised by the e2e suite (20 specs) and the production build.
- Coverage ratchet raised on the upgrade's real gains: functions 52 → 56,
  lines 57 → 60, statements 57 → 59 (branches hold at 53).
