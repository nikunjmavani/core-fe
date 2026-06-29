# GitHub automation (core-fe)

Long-lived branches: _dev_ (development), _main_ (production).

Workflow _file names_ describe _what_ runs; the YAML `name:` field is what appears in the GitHub Actions UI and in required status checks.

## Orchestrator workflows

| What it does                                                | File                                                                         | When it runs                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| PR merge gate (lint, typecheck, unit, build, E2E + core-be) | [pr-ci.yml](workflows/pr-ci.yml)                                             | `pull_request` → `main`, `dev` |
| PR title, labels, `.env` guard                              | [pr-governance.yml](workflows/pr-governance.yml)                             | Every PR event                 |
| Post-merge pipeline                                         | [post-merge-ci.yml](workflows/post-merge-ci.yml)                             | PR merged into `main`/`dev`    |
| Weekly FE ↔ BE contracts                                    | [scheduled-fe-be-integration.yml](workflows/scheduled-fe-be-integration.yml) | Tue 04:00 UTC + manual         |
| Weekly Lighthouse budgets                                   | [lighthouse.yml](workflows/lighthouse.yml)                                   | Wed 03:00 UTC                  |

## Reusable workflows

| What it does                      | File                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| Vitest unit + patch coverage      | [reusable-vitest-unit-only.yml](workflows/reusable-vitest-unit-only.yml) |
| Playwright E2E (core-be required) | [reusable-vitest-e2e.yml](workflows/reusable-vitest-e2e.yml)             |
| Netlify deploy                    | [reusable-netlify-deploy.yml](workflows/reusable-netlify-deploy.yml)     |

## Repo config

| Path                           | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| [environments/](environments/) | GitHub Environment docs + drift checks              |
| [rulesets/](rulesets/)         | Branch protection as code (`pnpm gh:rulesets:sync`) |
| [workflows/](workflows/)       | CI/CD YAML                                          |

Canonical deploy manifest: [`tooling/setup/setup.config.json`](../tooling/setup/setup.config.json).
