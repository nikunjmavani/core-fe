<!--
  PR title must follow Conventional Commits (used by release-please + commitlint):
    type(scope): short subject
  Examples: feat(auth), fix(organization), ci, docs, refactor(settings), perf(dashboard)
-->

## Summary

<!-- AI: fill structured bullets from commits / diff; link issue (Closes #123) when applicable. -->

- **What:** <!-- one line -->
- **Why:** <!-- one line -->
- **Risk:** <!-- low | medium | high -->

## Release type

<!--
  Pick exactly one. This drives release-please's bump on main.
  PR title prefix must match — `feat:` for minor, `fix:`/`perf:`/`refactor:` for patch,
  `<type>!:` (or `BREAKING CHANGE:` footer) for major.
  AI: feat=Minor, fix/perf/refactor=Patch, type!=Major, docs/ci/chore/test/style=No release
-->

- [ ] **Patch** — bug fix / perf / non-breaking refactor (`fix:`, `perf:`, `refactor:`)
- [ ] **Minor** — new feature, backward compatible (`feat:`)
- [ ] **Major (breaking)** — `feat!:` / `fix!:` / `BREAKING CHANGE:` footer
- [ ] **No release** — docs / ci / chore / test / style only

## Expected result

<!-- The observable behavior or CI signal after this lands. Bullet points are fine. -->

## Test plan

- [ ] `pnpm validate` (lint + typecheck + unit tests)
- [ ] `pnpm biome:check` (second lint lane)
- [ ] `pnpm test:e2e` (when UI behavior changed)
- [ ] `pnpm validate:structure` (when pages/ layout changed)
- [ ] `pnpm docs:lint:changed` (when markdown changed)
- [ ] `pnpm sonar:scan` (deployed-surface changes; pre-push runs it automatically)
- [ ] Additional checks specific to this change (visual baselines, manual smoke, etc.)

## Reviewer notes

<!-- AI: prefill so reviewers know where to focus; use "none" when not applicable. -->

- **Architecture:** <!-- none | island/layer change in area X -->
- **Routing:** <!-- none | new route island | guard change -->
- **Security:** <!-- none | auth surface | token handling | redirect logic -->
- **Performance:** <!-- none | bundle impact | render hot path -->
- **Tests:** <!-- none | unit/e2e added | baselines updated -->
- **Docs touched:** <!-- none | list paths -->

## Breaking changes

<!-- Required when Release type = Major. Otherwise write "None". Describe impact and migration steps. -->
