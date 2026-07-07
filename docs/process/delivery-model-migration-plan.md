# Delivery-model migration plan — trunk branching, release-please, CI/CD, and feature flags

**Status:** FINAL — execution-ready · 2026-07-07 · verified against `dev` @ `aab53f7`
(v1.0.0-dev.9) · decisions adopted in §11 · command-level runbook in §12

How core-fe moves from the current **`dev` + `main` dual-channel** model to **trunk-based
development on a single `main`** — covering the branch/PR flow, release-please versioning,
**and the full CI/CD pipeline redesign** (GitHub Actions + Netlify deploy contexts).

> **Scope.** Unlike the core-be sibling doc, deployment wiring is **in scope** here: the
> Netlify deploy lanes are where most of the efficiency is won. Out of scope: core-be, DNS,
> Netlify project/site provisioning (one project `core-fe` already exists and stays).

Related: [git-workflow.md](git-workflow.md) · [../deployment/cicd-and-netlify.md](../deployment/cicd-and-netlify.md)

---

## 1. Where we are today (verified inventory)

| Fact                | Value                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long-lived branches | `dev` (default branch, integration) + `main` (release)                                                                                                    |
| Versions            | `dev` = `1.0.0-dev.9` (tags `v1.0.0-dev.1…9`) · `main` manifest seeded `1.0.0`, **no stable tag ever cut**                                                |
| release-please      | `config.dev.json`/`manifest.dev.json` (prerelease channel) + `config.json`/`manifest.json` (stable) — selected by `CHANNEL_SUFFIX` in `post-merge-ci.yml` |
| Changelogs          | `CHANGELOG-dev.md` + `CHANGELOG.md`                                                                                                                       |
| Branch protection   | as code — `.github/rulesets/dev.json` + `main.json`, `pnpm github:sync`                                                                                   |
| Environments        | as code — `.github/environments/development.json` (ungated) + `production.json` (required reviewer)                                                       |
| Deploy              | ONE Netlify project: `main` → `--prod` (core-fe.netlify.app), `dev` → `--alias dev` (dev--core-fe.netlify.app)                                            |
| Known gap           | `RELEASE_PLEASE_TOKEN` PAT not provisioned — tripwire warns on every run; release-PR auto-merge cannot re-trigger post-merge CI                           |

### 1.1 Current flow — full picture

```text
                     feature/* · fix/*  (PR)
                          │  pr-ci.yml — path-filtered lanes → ONE required "quality-gate"
                          │  preview.yml — full build + artifact comment
                          ▼
 ════════════════════════ dev ══════════════════════════════════ (default branch)
     │ push → post-merge-ci.yml                          ▲
     │   changes → SBOM → unit+security → matrix gate    │
     │   → release-please  (config.DEV — prerelease)     │   post-release-backmerge.yml
     │       tags v1.0.0-dev.N + CHANGELOG-dev.md        │   (main → dev, on every stable
     │   → deploy → Netlify --alias dev  [ungated]       │    release published; 34 refs)
     │                                                   │
     │  PROMOTE: release-dev-to-production                │
     │  (dev → main PR, ancestry-guarded ceremony)        │
     ▼                                                   │
 ════════════════════════ main ═══════════════════════════════════
       push → post-merge-ci.yml
         changes → SBOM → unit+security → matrix gate
         → release-please (config stable)   ⛔ APPROVAL #1 (production env gates the JOB —
         │                                     only because the PAT lives in that env)
         → deploy → Netlify --prod          ⛔ APPROVAL #2 (production env, EVERY main
                                               push deploys prod — release or not)
         → dispatch back-merge main → dev

 Watchdogs: scheduled-release-guards.yml — daily "main ⊆ dev" ancestry canary + env-drift
```

### 1.2 Pain points this migration removes

1. **Two human approvals on every `main` push** — even a docs merge parks two gated jobs.
2. **Prod deploy runs on every `main` push**, not only on releases — governance by approval
   fatigue instead of by design.
3. **The back-merge loop** (`post-release-backmerge.yml`, ancestry canary, ancestry-repair
   runbook) exists only because there are two branches.
4. **Prerelease tag spam** — every dev merge cuts `v1.0.0-dev.N`; 9 tags so far, zero of
   them shippable artifacts.
5. **The promote ceremony** (`release-dev-to-production`) is a whole guarded pipeline that
   exists only to move commits between two branches that should be one.
6. Dependabot needs `target-branch` overrides because `dev` is the default branch.
7. Two release-please configs, two manifests, two changelogs to keep in sync.

---

## 2. Target model

### 2.1 Branching (trunk)

```text
   feature/*  fix/*  refactor/*     (hours → ≤ 2 days; unfinished work behind
       │                             booleanString('false') env flags, not branches — §4)
       │  PR → pr-ci quality-gate + review → SQUASH-merge
       │       (PR title = conventional commit — becomes the squash commit)
       ▼
   ═══════════════════════ main ═══════════════════════════   ← the ONE branch
       │
       │  release-please refreshes ONE standing Release PR ("chore: release 1.1.0")
       ▼
   merge the Release PR ★ → version bump + CHANGELOG + tag v1.1.0 + GitHub Release

   hotfix an OLD shipped version:  release/1.0 ← cut from tag v1.0.0,
   short-lived, NEVER merged back (cherry-pick one-way if needed)
```

### 2.2 CI/CD — the four lanes

```text
 LANE 1 · PR (the merge gate) ────────────────────────────────────────────────
   pull_request → main
     pr-ci.yml          path-filtered parallel lanes → required "quality-gate"
     pr-docs-lane.yml   docs lint (path-filtered)
     pr-governance.yml  env-file guard, PR hygiene
     preview.yml        build artifact + sticky comment        [optional: fold into pr-ci]
   ── merge = squash; branch deleted; NO human approval anywhere in the lane

 LANE 2 · TRUNK (every merge to main — fully automatic, zero approvals) ──────
   push → main
     post-merge-ci.yml
       changes → SBOM → unit + security → matrix gate
       ├─► release-please (UNGATED — PAT is now a repo secret, no environment)
       │     refreshes the standing Release PR · releases_created = false
       └─► deploy-development → Netlify --alias dev   [development env, ungated]
             ⇒ dev--core-fe.netlify.app ALWAYS serves main HEAD
             ⇒ integration env = trunk, drift impossible by construction

 LANE 3 · SHIP (merge the Release PR — the ONE approval) ─────────────────────
   merge "chore: release 1.1.0" (auto-merge armed by the PAT)
     push → main → post-merge-ci.yml (same workflow, release path lights up)
       → release-please: cuts tag v1.1.0 + GitHub Release  · releases_created = true
       → release-sbom: attach SBOM to the release
       → deploy-development (as always)
       → deploy-production → Netlify --prod    ⛔ THE approval (production env reviewer)
             ⇒ core-fe.netlify.app serves exactly tag v1.1.0

 LANE 4 · ROLLBACK / REDEPLOY (no CI rerun) ──────────────────────────────────
   workflow_dispatch → reusable-netlify-deploy.yml
     inputs: target=production, ref=v1.0.0        ⛔ same production approval
     checkout tag → build with production env → --prod
     ⇒ shipping backward = same motion as shipping forward, minus the tag
```

```text
 SCHEDULED lane (unchanged cadence, retargeted to main only):
   codeql · mutation-test · lighthouse · cross-browser · cleanup-cache
   scheduled-release-guards: env-drift canary ONLY
     (prod serves latest stable tag? dev alias serves main HEAD?)
     — the "main ⊆ dev" ancestry canary is DELETED (nothing to diverge)
```

### 2.3 Environment mapping — before → after

|                                   | Today                                           | Target                                                                     |
| --------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `development` env (ungated)       | keyed to `dev` **branch** pushes                | keyed to **every `main` push** (trunk HEAD)                                |
| `production` env (reviewer-gated) | keyed to `main` **branch** pushes (all of them) | keyed to **releases only** (`releases_created == true`) + manual redeploys |
| Approvals per feature merge       | 2 (release-please job + deploy job)             | 0                                                                          |
| Approvals per ship                | 2 more                                          | **1** (deploy-production)                                                  |
| What prod serves                  | whatever `main` HEAD was at last approved push  | exactly the last release **tag**                                           |

### 2.4 CI/CD design decisions (the "why")

1. **release-please runs ungated.** Today the job selects the `production` environment
   solely because the PAT lives there as an environment secret — dragging a version-preview
   job behind a human gate. Move `RELEASE_PLEASE_TOKEN` to a **repository secret**; the job
   drops its `environment:` line entirely. Refreshing a Release PR is harmless; the human
   gate belongs at the prod deploy, nowhere else.
2. **One approval, at the only irreversible edge.** `deploy-production` keeps the
   `production` environment reviewer. Everything upstream is reversible (a bad merge is a
   revert; a bad Release PR just doesn't get merged).
3. **Deploy-per-purpose, not deploy-per-branch.** `deploy-development` (every trunk push)
   and `deploy-production` (releases only) are two jobs with different conditions — not one
   job whose meaning depends on which branch pushed.
4. **Rebuild per environment; no artifact promotion.** Vite bakes `VITE_*` at build time,
   so the prod deploy must rebuild with production env values (as it already does inside
   `reusable-netlify-deploy.yml`). The artifact identity guarantee comes from the **tag**:
   the prod build checks out `vX.Y.Z`, not "whatever main is now".
5. **Rollback is a redeploy of an old tag** via `workflow_dispatch` with a new `ref` input —
   no pipeline rerun, no revert-commit theater, same approval gate.
6. **Concurrency:** post-merge stays serialized per-ref without cancellation (release-please
   must observe every push); Netlify deploys stay serialized per-environment (already the
   case — a manual deploy queues behind an in-flight release deploy).
7. **Merge queue: deferred.** Squash-only + required quality-gate is enough at current PR
   volume; the `main` ruleset can enable a queue later without changing anything else.

---

## 3. release-please in the target model

- Runs on **every push to `main`** (and `release/**` for hotfix lines).
- Each run **refreshes ONE standing Release PR** — recomputes next version + changelog from
  all unreleased commits. No tag, no release, no deploy.
- **Merging the Release PR is the ship button**: version bump commit
  (`package.json` + `CHANGELOG.md` + `manifest.json`) → tag `vX.Y.Z` → GitHub Release →
  SBOM attach → gated prod deploy. All in one run of the same workflow.

```text
  merge  feat: A → main    version UNCHANGED · Release PR previews "1.1.0" · dev alias updated
  merge  fix:  B → main    version UNCHANGED · still previews "1.1.0"      · dev alias updated
  merge  the RELEASE PR ★  1.0.0 → 1.1.0 · tag v1.1.0 · [approve] · prod serves v1.1.0
```

**Bump rules** (highest wins among unreleased commits; never additive):

| Commit prefix                                                        | Bump  | Note                |
| -------------------------------------------------------------------- | ----- | ------------------- |
| `fix:`                                                               | patch | 5 fixes = one patch |
| `feat:`                                                              | minor |                     |
| `feat!:` / `BREAKING CHANGE:`                                        | major | opt-in only         |
| `refactor:` `docs:` `chore:` `perf:` `ci:` `test:` `build:` `style:` | none  | changelog only      |

### 3.1 Version baseline — closing out the `-dev.9` line

The dev channel (`1.0.0-dev.1…9`) was previewing **`1.0.0`**, which was never cut
(`manifest.json` says `1.0.0` but no `v1.0.0` tag exists). The cutover PR lands with a
one-time **`Release-As: 1.0.0`** footer, so the first single-channel Release PR cuts exactly
`v1.0.0` — the tag that closes the prerelease line. Next work then previews `1.0.1`/`1.1.0`.

```text
  1.0.0-dev.9  ──cutover──►  v1.0.0 (Release-As)  ──feat──►  v1.1.0  ──fix──►  v1.1.1 …
```

---

## 4. Feature flags — how unfinished work ships dark

Rule #1 of trunk-based: **merge daily, hide incomplete work behind flags — never behind
branches**. This section is the full flag lifecycle: create → dark → live → settled → gone.
The key finding from the repo audit: **core-fe already owns both halves of the machinery** —
what's missing is only the lifecycle discipline (registry + expiry enforcement).

### 4.1 What already exists (verified)

| Tier                                 | Mechanism                                                                                                                                                                                                               | State today                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Tier 1 — build-time env flags**    | `booleanString('false')` keys in `env-schema.ts` → `resolveBooleanFlag` → `platformConfig.*`; per-env value contracts via `envProfiles` (`pnpm validate:client-env`); the `env-schema-add` skill walks every touchpoint | **Production pattern** — powers `VITE_AUTH_*`, `VITE_DEVTOOLS`, `VITE_E2E_HOOKS`, … |
| **Tier 2 — runtime flags (PostHog)** | `FeatureFlagProvider` + `useFeatureFlag(flag)` in `src/app/analytics/` — fail-closed (PostHog not loaded ⇒ `false`), 3 s load timeout                                                                                   | **Built, zero consumers** — dormant, ready when needed                              |

### 4.2 Which mechanism for which job

| Situation                                                                        | Use                                     | Why                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permanent operational knob (auth methods, modules, diagnostics)                  | **Platform config** — existing sections | Not a feature flag: never expires, no `FF_` prefix, no remove-by                                                                                                                            |
| Hide unfinished / risky work until complete — **the trunk-based default (~90%)** | **Tier 1: `VITE_FF_*` env flag**        | Deterministic per environment, zero runtime deps, works for 100% of users, validated by existing env gates                                                                                  |
| Percentage rollout, A/B experiment, instant no-deploy kill switch                | **Tier 2: PostHog flag**                | Only tier that can target/percent. Constraint: consent-gated + adblock ⇒ a meaningful user share always evaluates `false` — so OFF must be a safe experience, never gate core functionality |

### 4.3 Tier 1 anatomy — one flag, seven touchpoints, one read seam

```text
  .env.example                    "# --- Feature flags (temporary — each has remove-by) ---"
       │ pnpm setup:local                 VITE_FF_CHECKOUT_V2=true   ← dev template value
       ▼
  .env.development (local)        flag ON while you build
  GitHub Environments:
    development ── VITE_FF_CHECKOUT_V2=true ──► deploy-development build ⇒ dev alias: ON
    production  ── (unset ⇒ schema default) ──► deploy-production  build ⇒ prod: OFF
                                                       ▲
  toggle prod later = set the variable + Lane-4 redeploy of the SAME tag (⛔ approval)
```

Creation touches seven places — the first five are exactly the `env-schema-add` skill's
existing checklist, the last two are new:

1. `env-schema.ts` — `VITE_FF_CHECKOUT_V2: booleanString('false')` (base + client schemas).
   FF keys stay **unpinned** in `envProfiles.production.allowed` — both values legal in prod
   (unlike diagnostics flags, which stay pinned off).
2. `platform-config.ts` — resolved into a dedicated **`platformConfig.featureFlags.checkoutV2`**
   namespace (one seam: greppable, type-safe, testable via the pure `resolvePlatformConfig(get)`).
3. `.env.example` — new `# --- Feature flags ---` sub-section, dev value active.
4. GitHub Environments — `development` variable `true`; `production` untouched (default off).
5. Docs — the env runbook table row (skill step).
6. **`src/core/config/feature-flags.ts` — the registry (new):**

```ts
export const FEATURE_FLAGS = {
  checkoutV2: {
    env: 'VITE_FF_CHECKOUT_V2',
    owner: 'nikunj',
    created: '2026-07-07',
    removeBy: '2026-10-05', // created + 90 d default; extending = a reviewed edit here
    description: 'Checkout rewrite — remove after GA + one settled release',
  },
} as const satisfies Record<string, FeatureFlagMeta>;
```

**Touchpoint 7 — deploy materialization (§5.5, the invisible one):** the Netlify build
step writes only an allowlist of `VITE_*` keys into `.env.production.local`; a
GitHub-Environment variable outside that list never reaches the Vite build. PR B makes
this generic for flags — all `VITE_FF_*` vars are materialized via a `toJSON(vars)`
filter, so touchpoints 1–6 stay sufficient forever and no flag can silently build as OFF.

**Bundle honesty:** `platformConfig` is resolved at runtime, so an OFF branch is **not**
tree-shaken. Cheap UI branches — don't care. Heavy features — gate the **lazy boundary**
(conditional route registration / `import()`), so the OFF chunk is never even downloaded;
this is repo-native (route islands + the `build:check` first-paint tripwire).

### 4.4 Lifecycle — five states, every transition mechanical

```text
 ┌────────┐ merge PRs ┌───────────────┐ flip prod var ┌──────┐ ≥1 release ┌─────────┐ removal PR ┌──────┐
 │ CREATE │──────────►│ DARK ON TRUNK │──────────────►│ LIVE │───────────►│ SETTLED │───────────►│ GONE │
 └────────┘           └───────────────┘ + Lane-4      └──────┘            └─────────┘ CI-forced  └──────┘
  ≤ 30 min             every merge      redeploy ⛔      kill switch =      flag idle    red gate at
  env-schema-add       testable ON at   same tag,       same motion        but code     removeBy forces
  + registry entry     dev alias;       minutes, no     backwards          still        the cleanup PR
  (removeBy stamped)   prod builds OFF  code change     (minutes)          flagged
```

| Transition        | Exact motion                                                                                                                                                                                                                                                             | Time     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Create**        | `env-schema-add` skill (5 touchpoints) + registry entry; `gh variable set VITE_FF_X --env development --body true`                                                                                                                                                       | ≤ 30 min |
| **Dark shipping** | Nothing — merge normally. Every trunk merge is live-testable ON at `dev--core-fe.netlify.app` and provably OFF in the prod build                                                                                                                                         | 0        |
| **Rollout**       | `gh variable set VITE_FF_X --env production --body true` → Lane 4 dispatch (current tag) → approve                                                                                                                                                                       | minutes  |
| **Kill switch**   | Same two steps with `false` — rollback without touching git                                                                                                                                                                                                              | minutes  |
| **Settle**        | Leave ON across ≥ 1 full release; watch Sentry + analytics                                                                                                                                                                                                               | —        |
| **Delete**        | One PR `refactor(flags): remove VITE_FF_X`: inline the ON path, drop schema key + config field + registry entry + `.env.example` line; `gh variable delete` in both environments. `tsc` (field gone ⇒ every call site errors), `knip`, and `validate:flags` catch strays | ≤ 30 min |

The rollout/kill rows are the CI/CD synergy: **a flag flip is a Lane-4 redeploy of the same
tag with different env** — no release, no revert, one approval, minutes.

### 4.5 The debt collector — `pnpm validate:flags`

Dead flags are the one real trunk-based debt, and tickets rot. So expiry lives **in the
repo** and fails **the pipeline** — the same raise-never ratchet philosophy as the coverage
and TSDoc budgets. A small `tooling/` validator (style: `validate:tokens`), wired into
`pnpm health` and the pr-ci structure lane:

1. **Bijection** — every `VITE_FF_*` schema key has a registry entry and vice versa.
2. **Metadata** — every entry has `owner`, `created`, `removeBy`.
3. **Expiry** — `removeBy` in the past ⇒ **FAIL** (CI red until the flag is removed, or the
   date is consciously extended in a reviewed registry edit).
4. **Early warning** — `removeBy` within 14 days ⇒ CI warning annotation.
5. **WIP limit** — more than **5 active flags** ⇒ FAIL (cleanup before new flags).

### 4.6 Tier 2 (PostHog) rules of engagement

Don't activate for the migration itself; the first real percentage-rollout need turns it on —
the provider is already merged. When that day comes: name flags `ff-<kebab-case>`, register
them in the **same registry** (`kind: 'runtime'` — the validator enforces `removeBy`
identically), read via the existing `useFeatureFlag`, treat `false` as the always-safe
baseline (consent decliners and adblock users permanently evaluate `false`), and delete the
PostHog-side flag only **after** the code-removal PR ships.

### 4.7 Worked example — checkout v2, end to end

```text
 day 0    PR "feat(checkout): scaffold v2 behind VITE_FF_CHECKOUT_V2" → merged DARK
 day 1-9  six more small PRs — each testable ON at the dev alias the minute it merges
 day 10   release v1.2.0 ships (flag OFF in prod — v2 code aboard, dark)
 day 11   flip prod var → Lane-4 redeploy v1.2.0 → LIVE   (regression? flip back: minutes)
 day 25   settled through v1.3.0 — no incidents
 day 30   PR "refactor(checkout): remove VITE_FF_CHECKOUT_V2" — 60 days before the red line
```

---

## 5. Workflow-by-workflow change matrix

| File                                                         | Action                  | What changes                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pr-ci.yml`                                                  | EDIT                    | `branches: [main, dev]` → `[main]`. Lanes and quality-gate unchanged — it stays the merge gate.                                                                                                                                                                                                                                                                                                                                |
| `pr-docs-lane.yml`                                           | EDIT                    | Same base-branch trim.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pr-governance.yml`                                          | KEEP                    | Already base-agnostic (`BASE_REF` fallback is `main`); sweep any residual refs.                                                                                                                                                                                                                                                                                                                                                |
| `preview.yml`                                                | EDIT                    | `branches: [main]`. **Optional:** fold the artifact upload into pr-ci's existing build lane and delete this workflow (−1 full build per PR).                                                                                                                                                                                                                                                                                   |
| `post-merge-ci.yml`                                          | **EDIT (core surgery)** | `push: branches: [main, 'release/**']`. Delete `CHANNEL_SUFFIX` — hardcode `config.json`/`manifest.json`. `release-please` job: **remove `environment:`**, read PAT from repo secret. Split `deploy` into `deploy-development` (main pushes, `development` env, unconditional after matrix gate) + `deploy-production` (`releases_created == 'true'` only, `production` env ⛔). Delete `dispatch-post-release-backmerge` job. |
| `post-release-backmerge.yml`                                 | **DELETE**              | Whole file (34 dev refs) — nothing to back-merge.                                                                                                                                                                                                                                                                                                                                                                              |
| `scheduled-release-guards.yml`                               | EDIT                    | Delete the branch-ancestry job. Keep + retarget env-drift: prod `version.json` ↔ latest stable tag; dev alias `version.json` ↔ `main` HEAD build.                                                                                                                                                                                                                                                                              |
| `reusable-netlify-deploy.yml`                                | EDIT                    | Drop `target_branch` input (env-file suffix keys off `github_environment` instead of branch name). Add optional `ref` input (checkout a tag) + expose it on `workflow_dispatch` → this becomes the rollback lane.                                                                                                                                                                                                              |
| `reusable-vitest-unit-only.yml` / `reusable-unit-gate.yml`   | KEEP                    | Untouched.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `codeql.yml`                                                 | EDIT                    | Branch filters → `main` only.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `cleanup-cache.yml`                                          | EDIT                    | Cache-ref cleanup for `dev` → `main`.                                                                                                                                                                                                                                                                                                                                                                                          |
| `dependabot-auto-merge.yml` + `.github/dependabot.yml`       | EDIT                    | Default branch becomes `main` → delete `target-branch` overrides; auto-merge (low-risk group) lands on trunk behind quality-gate.                                                                                                                                                                                                                                                                                              |
| `cross-browser.yml` / `lighthouse.yml` / `mutation-test.yml` | KEEP                    | No dev refs; verify in sweep.                                                                                                                                                                                                                                                                                                                                                                                                  |

**Non-workflow surfaces:**

| Surface                                                          | Action                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.github/release-please/config.dev.json` + `manifest.dev.json`   | DELETE                                                                                                     |
| `CHANGELOG-dev.md`                                               | Fold history into `CHANGELOG.md` (as the `1.0.0` section), then delete                                     |
| `package.json` `version`                                         | `1.0.0-dev.9` → `1.0.0`                                                                                    |
| `.github/rulesets/dev.json`                                      | DELETE, then `pnpm github:sync`                                                                            |
| `.github/rulesets/main.json`                                     | Require quality-gate, squash-only, linear history                                                          |
| `.github/environments/*.json`                                    | Unchanged shape; `production.json` keeps the reviewer — it now gates only real ships                       |
| Repo settings                                                    | Default branch `dev` → `main` · provision `RELEASE_PLEASE_TOKEN` as **repo secret**                        |
| agent-os commands                                                | `open-pr`, `ship` → base `main`; `release-dev-to-production` → retired, replaced by "merge the Release PR" |
| `agent-os/rules` + `.husky/pre-push`                             | Branch-naming: drop `dev` as long-lived; fix `LINT_BASE=origin/dev` comment                                |
| `CLAUDE.md`, `docs/process/git-workflow.md`, deployment runbooks | Rewrite for single trunk (Phase 5)                                                                         |

### 5.1 Blast-radius audit — co-changes the diff would otherwise break

Second-order surfaces found by auditing everything that encodes the dual-channel model
(each verified in-repo, not assumed):

| Surface                                                                                                                                                                                                                                                                                                                       | Impact if ignored                                                                                                          | Handling                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **`tests/ci` ci-policy suite** — 4 of 6 files pin the OLD wiring: `post-merge-ci.policy` asserts `branches: [dev, main]`; `release-please-manifests.policy` reads `config.dev.json` + the `-dev.N` invariant; `post-release-backmerge.policy` asserts the deleted workflow; `dependabot-flows.policy` pins auto-merge details | Every cutover PR goes **red in Vitest**, not just in review                                                                | Rewrite/delete **in the same PR** as each structural change (PR B, PR C) — the suite then locks the NEW invariants instead      |
| **Sentry release naming** — `vite.config.ts` sets `release.name = VITE_APP_VERSION`; the `-dev.N` suffix is what disambiguates channel builds today                                                                                                                                                                           | Post-cutover, every trunk alias build **and** prod would collapse into one Sentry release `1.0.0` → mixed/stale sourcemaps | PR B: `release.name` → `<version>+<buildId>` (unique per build; the `environment` tag already separates dev/prod)               |
| **`production` env `deploymentBranchPolicy: protectedBranches: true`**                                                                                                                                                                                                                                                        | GitHub rejects `deploy-production` from `release/**` pushes — the hotfix lane would fail its env check                     | Gate `deploy-production` on `ref == main`; hotfix prod deploys go through Lane 4 dispatch (which runs on `main`)                |
| **`main` ruleset allows only `merge`** + post-merge auto-merges release PRs with `gh pr merge --auto --merge`                                                                                                                                                                                                                 | Flipping the ruleset to squash-only without touching the workflow strands Release-PR auto-merge forever                    | PR C flips ruleset **and** workflow flag (`--squash`) **and** the policy test together; PR B / ship #1 stay on the merge method |
| **`sync-rulesets.mjs` only POSTs/PUTs** — no delete path                                                                                                                                                                                                                                                                      | Deleting `dev.json` locally leaves the remote dev ruleset alive → `dev` branch deletion stays blocked                      | Explicit §12.4 step: look up the ruleset id, `gh api -X DELETE` it                                                              |
| **Env-secret tooling** (`sync-env-secrets.mjs`, `validate-github-env.mjs`, drift canary) may model `RELEASE_PLEASE_TOKEN` per-environment                                                                                                                                                                                     | Repo-secret placement reads as environment drift → canary red                                                              | §12.1: align the tooling's expectations when setting the PAT                                                                    |
| **First Release PR changelog scope** — no stable release exists, so release-please may changelog the entire history into `1.0.0`, duplicating the hand-folded dev history                                                                                                                                                     | Bloated/duplicated `1.0.0` section on the first Release PR                                                                 | PR B: set `bootstrap-sha` (the final-promotion merge SHA) in `config.json`                                                      |

**Verified clean — no action needed:** README badges · `.github/PULL_REQUEST_TEMPLATE.md` ·
`sonar-project.properties` + local Sonar gate (only `.env.development` filename mentions) ·
`netlify.toml` (no branch contexts; deploys stay Actions-driven) ·
`workflow-run-triggers.policy.test.ts` · `development` environment (no branch policy, so
`main`-ref deploys pass) · `cross-browser` / `lighthouse` / `mutation-test` workflows
(schedule + dispatch only — scheduled runs use the default branch's workflow file, so they
follow the default-branch flip automatically).

### 5.2 Round-2 audit — governance & transition-window findings

| Surface                                                                                                                                                                                                                                                                                                                                                                                | Impact if ignored                                                                                                                                                                                                                                     | Handling                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solo-maintainer review deadlock** — `main` ruleset requires 1 approving review + code-owner review (`.github/CODEOWNERS` exists), and GitHub forbids self-approval. Release PRs (and every agent/self-authored PR) are owner-authored → requirements can never be satisfied; the admin `bypass_mode: pull_request` works only as a manual bypass click, **auto-merge waits forever** | Ship #1 auto-merge stalls; every day-to-day trunk merge needs a bypass click                                                                                                                                                                          | PR C: `required_approving_review_count` → 0, drop code-owner requirement for the solo phase (decision #9) — the human Merge click on green checks IS the gate. Until then: merge release PRs manually via admin bypass |
| **`strict_required_status_checks_policy: true`** — "branch must be up to date before merging"                                                                                                                                                                                                                                                                                          | On a moving trunk this is an update-branch → re-run-all-lanes tax on every concurrently-open PR; it serializes exactly what trunk-based parallelizes                                                                                                  | PR C: strict → false (decision #10). Post-merge unit+security is already the logical-conflict net; revisit via merge queue when volume grows                                                                           |
| **`required_signatures` on `main` + the CHANGELOG lint-fix step commits via CLI (unsigned)**                                                                                                                                                                                                                                                                                           | Under today's merge-commit method, an unsigned lint-fix commit on a release-PR branch would be **rejected on merge** (branch commits enter main history). Latent today only because both changelogs sit in markdownlint ignores (lint-fix is a no-op) | Ship #1: watch-item — if rejected, squash the release PR via bypass. Healed permanently by PR C squash-only (branch-commit signatures stop mattering; GitHub signs the squash commit)                                  |
| **Repo squash-message defaults** — currently `COMMIT_OR_MESSAGES`/`COMMIT_OR_PR_TITLE`: a single-commit PR's squash takes the _commit's_ title, not the PR title; PR-body footers never reach the commit                                                                                                                                                                               | "PR title = conventional commit" silently breaks for single-commit PRs; `Release-As`-style footers in PR bodies get dropped                                                                                                                           | 12.4: `squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=PR_BODY` — squash commits become PR title + body by construction                                                                              |
| **PR B lands under the _current_ merge-only ruleset** — squash isn't allowed on `main` yet, so "put `Release-As` in the PR body squash message" cannot work for PR B itself                                                                                                                                                                                                            | The 1.0.0 baseline footer never reaches `main` history → first release computes the wrong version                                                                                                                                                     | 12.2: carry `Release-As: 1.0.0` in the **final branch commit** of PR B (and repeat it in the merge-commit body) — release-please scans all history commits                                                             |
| **Cutover-window canary noise** — scheduled workflows run the **default branch's** file; between PR B (main-only) and the default flip, the daily ancestry guard runs dev's old copy and correctly reports dev missing main's commits                                                                                                                                                  | Red guard alerts all through the cutover window                                                                                                                                                                                                       | 12.1: `gh workflow disable scheduled-release-guards.yml` at freeze; 12.4: re-enable after the flip                                                                                                                     |
| **`dependabot-auto-merge.yml` selects `environment: development` solely to read the PAT** (env secret), and its policy test pins that line                                                                                                                                                                                                                                             | After 12.1 deletes environment-level PAT copies, the env selection is dead weight (repo secret resolves without it)                                                                                                                                   | PR C: drop the `environment:` line + update `dependabot-flows.policy.test.ts`. Bonus: PAT provisioning finally makes this flow's post-merge chain real (the PR #27 gap)                                                |
| **Required-check context names** (`Quality gate`, `unit / Unit + global`, `Checks`) are string-matched by the ruleset                                                                                                                                                                                                                                                                  | Renaming any pr-ci/gate job in the sweeps silently makes `main` unmergeable (check never reports)                                                                                                                                                     | PR B/C rule: don't rename PR-context jobs; if ever renamed, update `main.json` contexts in the same PR                                                                                                                 |

### 5.3 Optimizations adopted from the audit

1. **Reviews 0 + strict-up-to-date off** (PR C) — removes the two biggest per-merge
   frictions for a solo trunk; ruleset-only, reversible the day a second reviewer exists.
2. **Squash defaults = PR title + body** — conventional commits become a repo guarantee
   instead of a habit.
3. **Guard disable/enable window** — a noise-free cutover instead of expected-red alerts.
4. **One PAT, three fixes** — provisioning `RELEASE_PLEASE_TOKEN` simultaneously unblocks
   release tagging, release-PR auto-merge re-triggering, **and** the Dependabot post-merge
   chain (dev-deploy gap PR #27 documented).
5. **[you] 2-minute Netlify check** (12.1) — confirm the site has no linked-repo
   auto-builds, so Actions stays the only deployer and main pushes can't double-build.
6. **Auto-delete merged branches** — `gh repo edit --delete-branch-on-merge` (12.4) backs
   the cheat-sheet's "branch auto-deleted" promise; release-please is unaffected (its
   auto-merge already passes `--delete-branch=false`, and branch recreation is its normal
   cycle).
7. **Broadened PR D sweep** — includes `.github/environments/README.md` and the workflow
   header comments (both narrate the old dev→development mapping), not just docs/.

### 5.4 Round-3 audit — config-root findings

| Surface                                                                                                                                                                                                                                                                                       | Impact if ignored                                                                                                                           | Handling                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **`tooling/setup/setup.config.json` is the canonical branch ↔ environment mapping** (`{ name, branch, deploySecrets }` per environment; `setup-config.mjs` even hardcodes a `dev:` fallback). `sync-environments` / `sync-env-secrets` / `validate-github-env` / the drift canary all read it | Environment syncs and the drift canary keep asserting "development deploys from `dev`" — red canaries and wrong sync targets after cutover  | PR C: `development.branch` → `main` + update the `dev:` fallback in `setup-config.mjs`; re-run the drift check in 12.4 verify |
| **pr-ci base filter is `[main, dev]`** — the §5 matrix said trim to `[main]`, but hotfix PRs target `release/1.0`                                                                                                                                                                             | Hotfix PRs would have **no CI at all** — and since `main`-style required checks never report on that base, the lane is effectively unusable | PR C: `pr-ci` (and `pr-docs-lane`) base filters → `[main, 'release/**']` — **supersedes the §5 matrix row**                   |
| **`delete_branch_on_merge: false`** (repo setting) vs the cheat-sheet's "branch auto-deleted"                                                                                                                                                                                                 | Merged trunk branches accumulate forever                                                                                                    | 12.4 settings step (§5.3 #6)                                                                                                  |
| **`.github/environments/README.md`** documents the `dev → development` branch table                                                                                                                                                                                                           | Stale onboarding doc contradicts the new model                                                                                              | PR D sweep (explicitly listed now)                                                                                            |

**Cleared in round 3:** `.env.example` (no PAT mention — the 12.1 tooling-alignment concern
narrows to `setup.config.json` only) · `sync-env-secrets.mjs` (PAT not modeled in
`deploySecrets`) · `check-environments-drift.mjs` (no branch literals outside the config) ·
version-check on Lane-4 rollback (buildId changes → update toast fires → clients reload to
the older tag ✓) · release-please on `release/**` (once tag `v1.0.0` exists,
`bootstrap-sha` is ignored and the branch line versions itself correctly) · the hotfix
`--prod` "downgrade" scenario (only arises when prod genuinely runs the old line — exactly
the runbook's intent).

### 5.5 Round-4 audit — deploy-internals findings

| Surface                                                                                                                                                                                                                             | Impact if ignored                                                                                                                                                                                           | Handling                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Flag deploy materialization** — the Netlify build step writes only 8 hardcoded `VITE_*` keys into `.env.production.local` ("keep this list in sync" comment); GitHub-Environment vars outside the list never reach the Vite build | A `VITE_FF_*` var set `true` in the `development` environment would be **silently ignored** — the dev alias builds flag-OFF and §4.4's "testable ON at the alias" promise breaks                            | PR B (`reusable-netlify-deploy` edit): materialize **all `VITE_FF_*` vars generically** via `${{ toJSON(vars) }}` → filter → append (§4.3 touchpoint 7)                                                                        |
| **`buildId` is `Date.now()+random`** (`plugins/version-json.ts`), minted inside the plugin closure — not a git SHA, not in `env` at config-eval time                                                                                | Two effects: Lane-4 rollback works _better_ than assumed (fresh buildId → the update toast fires on downgrades too ✓); but the Sentry `release.name = <version>+<buildId>` change cannot read it from `env` | PR B implementation note: hoist the buildId computation in `vite.config.ts` and pass the same value to both the version-json plugin and `sentryVitePlugin`                                                                     |
| **The env-drift canary is a CONFIG-drift checker** (`check-environments-drift.mjs` + `sync-rulesets.mjs --check` vs committed JSON) — it never inspects deployed `version.json`                                                     | The §5 matrix instruction "retarget env-drift at prod/alias version.json" was **wrong** — there is no such logic to retarget                                                                                | **Supersedes the §5 row:** PR B touches the guards file only to delete the ancestry job. Bonus: after PR C, `--check` itself fails while the remote dev ruleset lingers — the canary enforces the §12.4 manual DELETE for free |
| **`CHANGELOG.md` already contains alpha-era sections** (`1.1.0-alpha.0`, alpha compare links), and release-please generates its own `## 1.0.0` heading on the Release PR                                                            | A hand-written `## 1.0.0` section collides with the generated one (duplicate headings); a naive fold also buries the alpha history confusingly                                                              | §12.2 fold rule: insert the `-dev.N` sections **as-is** below the top (release-please owns the `1.0.0` heading), above the alpha-era sections, with a one-line provenance divider                                              |
| **Deploy version comes from the manifest at the checked-out ref** (`manifest${suffix}.json` → `VITE_APP_VERSION`)                                                                                                                   | Confirms two assumptions: Lane-4 tag redeploys self-report the tag's version ✓; the suffix logic is exactly the `target_branch` coupling PR B removes                                                       | No new action — recorded so the implementer knows the mechanism                                                                                                                                                                |

**Round-4 notes:** a post-deploy smoke (curl `version.json`, non-empty `buildId`) already
exists in the reusable — §12 verify steps lean on it rather than duplicating it.
**Anti-optimization:** keep `deploy-development` firing on every `main` push including
docs-only merges — a conditional deploy would break the "alias = trunk HEAD" invariant
that keeps the model legible; a ~2-minute rebuild is the cheap price of an always-true
statement.

---

## 6. Migration phases

### Phase 0 — Freeze, sync, provision _(no PR)_

1. **Provision `RELEASE_PLEASE_TOKEN`** (PAT, repo + workflow scopes) as a **repository
   secret** — prerequisite: the first trunk release must auto-merge + re-trigger correctly.
2. Merge/close all open PRs targeting `dev` (⚠ deleting a base branch **closes** its open
   PRs — retarget anything worth keeping to `main` later; close the standing
   `release-please--branches--dev` PR permanently).
3. **Final `dev` → `main` promotion** via the existing `release-dev-to-production` flow —
   its last ever run; nothing stranded.
4. **Freeze** merges (~hours).

### Phase 1 — Single channel + CI/CD surgery _(1 PR, based on and targeting `main`)_

> ⚠ Must target `main`, not `dev`: after this lands, a push to `dev` would look for the
> deleted `config.dev.json`. `dev` is frozen and at parity, so nothing is lost.

- All **release-please** deletions/edits from §5 (configs, manifests, changelog fold,
  `package.json` reconcile).
- All **`post-merge-ci.yml`** surgery from §5 (trigger, channel, ungated release-please,
  deploy split).
- **Delete** `post-release-backmerge.yml`; edit `scheduled-release-guards.yml`;
  edit `reusable-netlify-deploy.yml` (ref input, drop target_branch).
- Land the squash with footer **`Release-As: 1.0.0`** → first Release PR cuts `v1.0.0`.

### Phase 2 — Retire `dev` _(1 PR + settings)_

- Rulesets: delete `dev.json`, tighten `main.json`, run `pnpm github:sync --prune --yes`
  (upserts `main`; `--prune` deletes the now-orphaned remote `dev` ruleset).
- Repo settings: default branch → `main`.
- Sweep branch filters: `pr-ci`, `pr-docs-lane`, `preview`, `codeql`, `cleanup-cache`,
  dependabot files.
- agent-os commands + branch-naming rule + pre-push comment.
- Tag `archive/dev` at the final `dev` SHA, then **delete the `dev` branch**.

### Phase 3 — Feature-flag machinery _(1 small PR — independent; can land before the cutover)_

- Ship the §4 kit: `src/core/config/feature-flags.ts` registry + the
  `platformConfig.featureFlags` seam + `pnpm validate:flags` (wired into `pnpm health` and
  the pr-ci structure lane) + the `.env.example` `# --- Feature flags ---` sub-section.
- Process rules (§4.4–4.5): flags-not-branches · 90-day default TTL · ≤ 5 active flags ·
  the removal PR is part of the feature's definition of done.
- Nothing here depends on the cutover — it works identically under dual-channel, so this PR
  can land first and be exercised before trunk day one.

### Phase 4 — Hotfix runbook _(write-once; wiring ships in Phase 1)_

```text
  main is current (the normal case):
     fix: PR → main → merge Release PR → approve prod deploy.  No extra branch.

  patch an OLD shipped version:
     git switch -c release/1.0  v1.0.0        (short-lived; NEVER merged back)
     → fix → post-merge-ci runs on release/** → release-please cuts v1.0.1
     → deploy via LANE 4 dispatch (target=production, ref=v1.0.1)  ⛔ approval
       (always Lane 4 for hotfix prod deploys: deploy-production is main-ref-gated —
        the production env branch policy rejects release/* refs — §5.1)
     → cherry-pick to main if the bug exists there too (one-way)
```

### Phase 5 — Docs & muscle memory _(1 PR)_

- Rewrite `git-workflow.md`, deployment runbooks, `CLAUDE.md` sections; index this plan's
  successor doc in `docs/README.md`; publish the cheat-sheet (§8).

---

## 7. Cutover order (safe, reversible)

**The pivot is step 2 — the `dev → main` promotion.** Everything before it still uses the
dual-branch model (PR A lands on `dev`); **from the promotion onward, `main` is the single
trunk and every PR/merge targets `main` directly** — `dev` is frozen at step 2 and deleted at
step 6.

```text
  0. Flag-kit PR A → dev  (ready now; carried into main by step 2)   [Phase 3]
  1. PAT as repo secret · drain/close dev-based PRs · freeze         [Phase 0]
  2. ★ PROMOTE dev → main  ── THE TRUNK BEGINS HERE ──               [Phase 0]
       not a fast-forward (main has 3 release-please commits dev
       lacks) → reconciling merge via release-dev-to-production;
       its last run. After this, target main for everything.
  3. PR B → main  (single-channel + CI/CD surgery, Release-As 1.0.0) [PR #1]
  4. Merge the first Release PR → v1.0.0 → approve prod              [ship #1 = smoke test
                                                                     of the whole new pipeline]
  5. PR C → main  (rulesets sync + default-branch flip)             [Phase 2]
  6. Tag archive/dev → delete dev branch                            [Phase 2]
  7. PR D → main  (docs)                                            [Phase 5]

  Rollback at any step: revert the PRs; restore dev from archive/dev tag;
  re-add dev.json ruleset + re-sync. Nothing is destructive except step 6,
  and the archive tag covers that.
```

Step 4 is deliberate: cut `v1.0.0` **before** deleting `dev`, so the full
merge-Release-PR → tag → SBOM → approved-prod-deploy path is proven while rollback to the
old model is still trivial.

This section is the conceptual order; **§12 is the operational, command-level expansion** —
including the flag-kit PR (Phase 3), which lands on `dev` before the promotion.

---

## 8. Day-to-day cheat-sheet (post-migration)

```text
  DEVELOPER (many times a day)             SHIP (on your cadence)
  ────────────────────────────             ──────────────────────
  git switch main && git pull              open "chore: release 1.1.0" PR
  git switch -c fix/login-bug              review version + changelog
  …small change…                           click [Merge]
  PR title: "fix: login bug"               approve the ONE prod gate
  squash-merge → branch auto-deleted         └─► tag v1.1.0 live on prod
  dev alias now serves your merge
                                           ROLLBACK (rare)
  unfinished? → flag OFF, merge anyway     dispatch netlify deploy, ref=v1.0.0
                                           same approval, no CI rerun

  FLAG FLIP (prod feature ON/OFF — no release, no git)
  gh variable set VITE_FF_X --env production --body true   (or false to kill)
  → Lane-4 redeploy of the current tag → same 1 approval → live in minutes   (§4.4)
```

- **Integrate often** (merge to `main`), **release on cadence** (merge the Release PR).
- Merge a feature ≠ release — feature merges refresh the preview and the dev alias only.

---

## 9. Efficiency scorecard

| Metric                                                 | Today                                                                                     | Target                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Human approvals per feature merge                      | **2** (release-please + deploy jobs gated on every main push)                             | **0**                                                                 |
| Human approvals per ship                               | 2 more                                                                                    | **1** (prod deploy only)                                              |
| Pipelines per feature reaching prod                    | ~6 (PR CI → dev post-merge → promote PR CI → main post-merge → back-merge PR → its PR CI) | **2** (PR CI → main post-merge) + 1 shared ship run per release batch |
| Prod deploys triggered                                 | every `main` push (each needing approval)                                                 | releases only                                                         |
| Long-lived branches / configs / manifests / changelogs | 2 each                                                                                    | 1 each                                                                |
| Workflows                                              | 17                                                                                        | 15–16 (backmerge deleted; preview optionally folded)                  |
| Tags per shipped change                                | `-dev.N` spam + stable                                                                    | stable only                                                           |
| Sync machinery                                         | back-merge workflow + ancestry canary + repair runbook                                    | none                                                                  |
| Rollback                                               | re-run pipeline / revert commit                                                           | redeploy old tag (1 dispatch + 1 approval)                            |

---

## 10. Risks & mitigations

| Risk                                                        | Mitigation                                                                                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-flight `dev` work stranded                               | Phase 0 final promotion + PR drain before anything else                                                                                                                    |
| Deleting `dev` closes its open PRs                          | Explicit Phase 0 step: retarget/close all dev-based PRs first                                                                                                              |
| PAT still missing at cutover → first release silently stuck | PAT provisioning is Phase 0 step 1, not an afterthought; existing tripwire warning stays                                                                                   |
| Version discontinuity                                       | One-time `Release-As: 1.0.0`; prerelease history preserved in `CHANGELOG.md`                                                                                               |
| New pipeline breaks on first ship                           | Cutover step 3 ships `v1.0.0` while the old model is still restorable                                                                                                      |
| Muscle memory targets `dev`                                 | Default-branch flip + rulesets (pushes to `dev` impossible — branch gone) + Phase 5 docs/commands                                                                          |
| Long branches creep back                                    | Branch-naming policy + flags-not-branches rule (Phase 3)                                                                                                                   |
| Netlify dev alias meaning changes silently                  | Announce: `dev--core-fe.netlify.app` = trunk HEAD from cutover day; env-drift canary verifies it                                                                           |
| Dead flags accumulate (the real trunk-based debt)           | `validate:flags` expiry ratchet turns CI red at `removeBy`; WIP limit ≤ 5 active flags (§4.5)                                                                              |
| Flag flipped in prod but next release forgets it            | Flags are env-driven, not code-driven — the next tag build reads the same production variable, so the state carries; env-drift canary + registry review on each Release PR |

---

## 11. Decisions (adopted for execution)

Defaults below are what §12 executes; overriding any of them before the corresponding step
is a one-line change to this table.

| #   | Decision                      | Adopted                                                                                                                                                                    |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dev alias semantics           | **Keep `dev--core-fe.netlify.app` = `main` HEAD** — zero Netlify changes; announce the meaning change                                                                      |
| 2   | `preview.yml` fold into pr-ci | **Defer** — keep cutover minimal; listed as a post-cutover optimization (§12.7)                                                                                            |
| 3   | PAT placement                 | **Repository secret** `RELEASE_PLEASE_TOKEN` — release-please runs ungated                                                                                                 |
| 4   | Version baseline              | **`Release-As: 1.0.0`** — first trunk release closes out the `-dev.9` line                                                                                                 |
| 5   | `dev` disposal                | **Tag `archive/dev`, then delete** the branch                                                                                                                              |
| 6   | Merge queue                   | **Defer** until PR volume demands it (ruleset-only change later)                                                                                                           |
| 7   | Flag guardrails               | **90-day default TTL · max 5 active flags**, `validate:flags`-enforced                                                                                                     |
| 8   | Tier 2 (PostHog) flags        | **Tier-1-only** until the first real percentage-rollout need; provider stays dormant                                                                                       |
| 9   | Review requirements on `main` | **0 approvals, no code-owner review** for the solo phase (§5.2 deadlock) — the human Merge click on green checks is the gate; restore ≥ 1 the day a second reviewer exists |
| 10  | Strict up-to-date checks      | **Off** (§5.2) — post-merge unit+security is the logical-conflict net; revisit together with the merge queue                                                               |

---

## 12. Execution runbook — PR-by-PR

Actor legend: **[agent]** = implemented/driven by Claude · **[you]** = admin/browser action
(PAT creation, approvals, settings). Every PR goes through normal pr-ci + review.

### 12.0 PR A — flag kit _(Phase 3 · independent · can land first, under dual-channel)_

Branch `feat/feature-flag-kit` → PR title `feat(flags): flag registry, validate:flags gate, platform seam`

- [agent] `src/core/config/feature-flags.ts` — registry + `FeatureFlagMeta` type (§4.3).
- [agent] `platform-config.ts` — empty `featureFlags` namespace resolved from the registry.
- [agent] `tooling/` validator + `validate:flags` script in `package.json`; wire into
  `pnpm health` and the pr-ci structure lane (§4.5 rules).
- [agent] `.env.example` — `# --- Feature flags (temporary — each has remove-by) ---`
  sub-section (empty, documented).
- [agent] Colocated tests for registry/validator; `pnpm health` green.
- **Verify:** `pnpm validate:flags` passes on empty registry; fails on a fixture flag with
  a past `removeBy`.

### 12.1 Step 0 — preconditions + the `dev → main` promotion _(no PR)_

This step ends with **the pivot: `dev` merges into `main` and, from here on, every PR and
merge targets `main` directly** (`dev` is frozen now and deleted in 12.4). Preconditions
1–2 and 5–6 set up a clean, quiet promotion; **step 4 is the promotion itself**.

1. [you] Create a classic PAT, scopes `repo` + `workflow`.
   [agent] `gh secret set RELEASE_PLEASE_TOKEN --body <PAT>` (repository secret); delete any
   environment-level copies so there is exactly one source. Align `sync-env-secrets.mjs` /
   `validate-github-env.mjs` if they model the PAT per-environment (§5.1).
2. [agent] Inventory `gh pr list --base dev` → merge what's ready (incl. **PR A**, the
   flag kit, so the promotion carries it into `main`), close the rest (they can be re-opened
   against `main` later); close the standing `release-please--branches--dev` PR.
3. [you] 2-minute Netlify check: Site settings → Build & deploy → confirm **no linked-repo
   auto-builds** (Actions must stay the only deployer — §5.3).
4. **★ [agent] PROMOTE `dev → main` — the trunk begins here.** Run the existing
   `release-dev-to-production` flow (its last ever run). ⚠ **Not a fast-forward:** `main`
   carries 3 release-please stable commits (manifest/changelog, PR #42) that `dev` lacks, so
   this is a reconciling merge, not a reset — the ceremony is built for exactly this.
   Confirm `origin/main` now contains all of `dev` (`git merge-base --is-ancestor origin/dev
origin/main`). ⚠ This push runs the **old** `post-merge-ci` one last time: the stable
   release-please job (now PAT-backed) opens/refreshes a Release PR, and the deploy job ships
   the promoted content to **production** behind its 2 approvals. That is expected — it is the
   last 2-approval prod deploy; PR B (12.2) removes the tax. After this step, **do not push to
   `dev`** — everything targets `main`.
5. [agent] `gh workflow disable scheduled-release-guards.yml` — silences the expected-red
   ancestry canary during the cutover window (§5.2); re-enabled in 12.4.
6. [you] Announce freeze (~hours): no `dev` merges; only the cutover PRs to `main` until
   §12.3 completes.

### 12.2 PR B — single channel + CI/CD surgery _(Phase 1 · based on & targeting `main`)_

Branch `chore/trunk-single-channel` → PR title
`chore(ci): collapse release to single-channel trunk on main`. Baseline footer: `main` is
still **merge-commit-only** at this point (§5.2), so `Release-As: 1.0.0` goes in the
**final branch commit's footer** and is repeated in the merge-commit body — release-please
scans both.

- [agent] Delete `config.dev.json`, `manifest.dev.json`; fold `CHANGELOG-dev.md`'s
  `-dev.N` sections **as-is** into `CHANGELOG.md` — below the top (release-please owns the
  generated `## 1.0.0` heading — §5.5), above the alpha-era sections, with a one-line
  provenance divider; delete `CHANGELOG-dev.md`; `package.json` → `1.0.0`.
- [agent] `post-merge-ci.yml`: `push: [main, 'release/**']`; remove `CHANNEL_SUFFIX`;
  release-please job → no `environment:`, repo-secret PAT; split deploy into
  `deploy-development` (main pushes, ungated) + `deploy-production`
  (`releases_created == 'true'` **and** `ref == main`, production env ⛔ — §5.1); delete
  the back-merge dispatch job.
- [agent] Delete `post-release-backmerge.yml`; `scheduled-release-guards.yml` → drop the
  ancestry job only (the env-drift job is a config-drift checker and needs no retarget —
  §5.5); `reusable-netlify-deploy.yml` → drop `target_branch`, add `ref` input (rollback
  lane), and materialize all `VITE_FF_*` environment vars generically via
  `${{ toJSON(vars) }}` (§5.5 / §4.3 touchpoint 7).
- [agent] Same-PR policy-test updates (§5.1): delete `post-release-backmerge.policy.test.ts`;
  rewrite `release-please-manifests.policy.test.ts` for the single manifest (stable semver,
  no prerelease); update `post-merge-ci.policy.test.ts` to the new invariants
  (`[main, 'release/**']`, envless release-please, deploy split, main-only prod deploy).
- [agent] `vite.config.ts` — Sentry `release.name` → `<version>+<buildId>` so every trunk
  build stays a distinct Sentry release (§5.1). Implementation: hoist the buildId
  computation out of the version-json plugin closure and share one value with both plugins
  (§5.5).
- [agent] `config.json` — add `bootstrap-sha: <final-promotion merge SHA>` so the first
  Release PR does not changelog the entire history (§5.1).
- **Preflight before merging:** run release-please locally in dry-run mode against the PR
  branch (`pnpm dlx release-please release-pr --dry-run --repo-url ... --config-file ...
--manifest-file ...`) — proves the config parses, `bootstrap-sha` is honored, and the
  computed version is exactly `1.0.0` without burning the one-shot cutover.
- **Verify after merge:** post-merge run shows **no approval pause** before release-please;
  `deploy-development` updates the alias —
  `curl -s https://dev--core-fe.netlify.app/version.json` shows the merge's buildId; a
  Release PR **"chore: release 1.0.0"** is open with auto-merge armed.

### 12.3 Ship #1 — cut `v1.0.0` _(smoke test of the whole new pipeline)_

1. [agent] Watch the Release PR. ⚠ Auto-merge cannot complete while `main` still requires
   1 approving review (§5.2 solo-review deadlock) — expect **[you] to Merge via the admin
   bypass dialog**. If the merge is rejected over `required_signatures` (unsigned CLI
   lint-fix commit on the release branch — §5.2), bypass covers that too; PR C heals both
   permanently.
2. **[you] Approve the `production` gate** on the resulting post-merge run — the only
   human approval in the new model.
3. **Verify:** `gh release view v1.0.0` (exists, SBOM asset attached);
   `curl -s https://core-fe.netlify.app/version.json` serves the `v1.0.0` build;
   `package.json` on `main` reads `1.0.0`.

### 12.4 PR C — retire `dev` _(Phase 2 · order inside this step is load-bearing)_

Branch `chore/retire-dev-branch` → PR title
`chore(repo): main-only rulesets, filters, and defaults`

- [agent] Delete `.github/rulesets/dev.json`; tighten `main.json` (required quality-gate,
  squash-only, linear history). Flip `allowed_merge_methods` to `["squash"]` **together
  with** post-merge-ci's auto-merge flag (`--merge` → `--squash`) and its policy test, plus
  `dependabot-flows.policy.test.ts` (§5.1). Solo-phase governance (§5.2, decisions #9/#10):
  `required_approving_review_count` → 0, drop `require_code_owner_review`, strict
  up-to-date → false. Drop the dead `environment: development` line from
  `dependabot-auto-merge.yml` (+ its test). ⚠ Keep PR-context job names stable — the
  ruleset string-matches `Quality gate` / `unit / Unit + global` / `Checks` (§5.2). Sweep
  branch filters: `pr-ci`, `pr-docs-lane`, `preview`,
  `codeql`, `cleanup-cache`, `dependabot-auto-merge` + `.github/dependabot.yml`
  (drop `target-branch`) — pr-ci/pr-docs-lane base → `[main, 'release/**']` so hotfix PRs
  keep the quality gate (§5.4). Update `tooling/setup/setup.config.json`
  (`development.branch` → `main`) + the `dev:` fallback in `setup-config.mjs` (§5.4). agent-os commands (`open-pr`, `ship`) → base `main`; retire
  `release-dev-to-production`; branch-naming rule + `.husky/pre-push` comment.
- Then, strictly in this order (each blocks the next):
  1. [agent] Merge PR C.
  2. [you/agent] Default branch → `main`: `gh repo edit --default-branch main`. Set squash
     defaults so squash commits = PR title + body (§5.2):
     `gh api -X PATCH repos/nikunjmavani/core-fe -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY`.
     Enable auto-delete of merged branches: `gh repo edit --delete-branch-on-merge`
     (§5.3 #6).
  3. [agent] `pnpm github:sync --prune --yes` updates `main` AND deletes the orphaned
     remote dev ruleset in one step — sync upserts committed rulesets, and `--prune`
     removes any remote branch ruleset not in `.github/rulesets/*.json`.
  4. [agent] `git tag archive/dev origin/dev && git push origin archive/dev`.
  5. [agent] `git push origin --delete dev`.
  6. [agent] `gh workflow enable scheduled-release-guards.yml` (disabled in 12.1; the
     default branch now serves the rewritten guard).
- **Verify:** `gh repo view --json defaultBranchRef` = main; `git ls-remote origin dev`
  empty; a scratch PR defaults to base `main`; Dependabot config validates.

### 12.5 PR D — docs & muscle memory _(Phase 5)_

Branch `docs/single-trunk-workflow` → PR title
`docs(process): rewrite workflow docs for single-trunk model`

- [agent] Rewrite `git-workflow.md` + deployment runbooks; update `CLAUDE.md`
  branch/release sections; index this doc in `docs/README.md`; publish the §8 cheat-sheet.
- [agent] Residual sweep — broadened (§5.3 #7): `grep -rniE '\bdev\b' docs/ CLAUDE.md agent-os/ .github/`
  then manually triage; must reach zero **live** references (historical
  changelog/plan mentions and `.env.development` filenames exempt). Explicitly includes
  `.github/environments/README.md` and workflow header comments (they narrate the old
  dev→development mapping).

### 12.6 Aftercare _(first two weeks)_

- Keep `v1.0.0-dev.*` tags (history; they precede `v1.0.0` in semver order).
- Watch the env-drift canary and the first few Lane-2 runs; confirm the standing Release PR
  keeps re-computing (`1.0.1`/`1.1.0`) as merges land.
- First unfinished feature → create the first real `VITE_FF_*` flag through the §4.4 table.
- Local clones: `git fetch --prune && git remote set-head origin -a`, then
  `git branch -D dev` — kills the muscle memory at the git level too.

### 12.7 Post-cutover optimizations _(optional, separate PRs)_

- Fold `preview.yml` into pr-ci's build lane (−1 full build per PR).
- Merge queue on `main` when PR volume grows (ruleset-only).
- Netlify PR deploy-previews if artifact comments prove insufficient.
- Tag-protection ruleset for `v*` (block tag deletion/moves) — prod deploys check out
  tags, so released tags should be immutable.
- Remove `bootstrap-sha` from `config.json` once `v1.0.0` exists (it is ignored after the
  first release; removal is pure tidiness).

---

## 13. Assumptions & residual risks (verifiable only at execution)

Everything in §1–§12 was verified from the checkout. The items below **could not be** —
they depend on runtime GitHub/Netlify state or on never-exercised code paths. Listed here
so a resuming session treats them as _to-confirm_, not _known-true_, and knows exactly
where each is caught. None blocks planning; each has a cheap checkpoint.

| #   | Assumption the plan rests on                                                                                                                                      | Why unverifiable from a checkout                                                                    | Caught at                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A1  | `tooling/setup/setup.config.json` has the `{ name, branch, deploySecrets }` shape the loader implies                                                              | Only the loader (`setup-config.mjs`) was read, not the JSON itself                                  | PR C impl — Read the file first; §5.4 handling works for either shape                  |
| A2  | Netlify site has **no linked-repo auto-builds** (Actions is the only deployer)                                                                                    | Netlify dashboard state, not in the repo                                                            | §12.1 step 3 — [you] 2-minute UI check                                                 |
| A3  | Repo setting **"Allow auto-merge" is ON**                                                                                                                         | Not exposed in the API fields fetched; the Dependabot flow's own comment lists it as a prerequisite | Ship #1 — a failed auto-merge arm surfaces it immediately; toggle is one click         |
| A4  | The **first stable release path works end-to-end** (release-please cuts a tag + GitHub Release on `github.token`→PAT; SBOM attaches) — it has literally never run | No stable tag has ever been cut on this repo                                                        | §12.2 dry-run preflight (version) + Ship #1 (§12.3), while `dev` is still the rollback |
| A5  | **Auto-merge actually completes** once reviews→0 lands (PR C)                                                                                                     | GitHub ruleset + auto-merge interaction can't be tested pre-flip                                    | Ship #1 uses admin bypass regardless (§12.3); day-2 merges confirm the steady state    |
| A6  | `required_signatures` does **not** reject the merge (unsigned CLI lint-fix commit on release branch)                                                              | Depends on the merge method GitHub uses at merge time                                               | §12.3 watch-item; PR C squash-only heals it permanently                                |
| A7  | The **rewritten policy tests** in PR B/PR C actually pass in CI                                                                                                   | They're authored against the new wiring but run only in the PR                                      | Each PR's own `ci-policy` Vitest lane                                                  |
| A8  | `release-please-action` output field names (`prs`/`pr` JSON) match the lint-fix + auto-merge steps                                                                | Action-version-dependent; the workflow already parses both shapes defensively                       | Ship #1 — release-PR handling either works or logs "No release PRs"                    |

**Rule for the resuming session:** confirm A1–A3 before/at their step (cheap, pre-merge);
A4–A8 are validated by Ship #1 **by design** — that is why the cutover order cuts `v1.0.0`
while `dev` still exists as a one-command rollback (§7). If Ship #1 exposes any of them,
the fix is local and the escape hatch is intact.
