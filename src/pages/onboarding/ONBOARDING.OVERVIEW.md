# `pages/onboarding` — Post-signup onboarding wizard

Route: `/onboarding`. Where a freshly authenticated user with **no organization** lands
(redirect enforced in `app/routes/routeTree.tsx`).

## Files

| File                      | Responsibility                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding.route.tsx`    | Route marker — exports `Component` rendering `OnboardingPage`.                                                                                                                                                                                                                                          |
| `onboarding.manifest.ts`  | Page manifest — `testId` + document title from `onboarding.constants.ts` + i18n.                                                                                                                                                                                                                        |
| `onboarding.constants.ts` | i18n keys, test ids, analytics events, API defaults for this island.                                                                                                                                                                                                                                    |
| `OnboardingPage.tsx`      | Multi-step wizard (welcome → profile → questions → workspace → invite → done). Reads/writes progress from `@/shared/store/useOnboardingStore/` so a refresh resumes mid-flow. On finish it creates the org (team modes), activates the workspace, and navigates **directly** to the resolved dashboard. |

Step UIs live in `components/` (folder-per-unit): `WelcomeStep`, `ProfileStep`
(**first name + last name** — maps 1:1 to core-be `first_name` / `last_name`),
`QuestionsStep` (optional team-size / use-case / referral chips), `WorkspaceStep` (org name +
live `core.app/<slug>` preview, work-email-domain prefill), `InviteStep` (validated teammate
emails), `DoneStep`, plus `StepIndicator`.

## Finish flow (idempotent + best-effort)

`finish()` is safe to retry. The created org id is stashed in the store the moment creation
succeeds, so a retry after a partial failure **reuses** it instead of creating a duplicate.
Invitations are sent with `Promise.allSettled` — a single bad address never strands the user;
failures are surfaced as a toast and resendable from Members. Profile (first + last name) and
the qualifying-question answers are persisted **best-effort** (`authApi.updateProfile` +
a PostHog `onboarding_completed` segmentation event) and never block dashboard entry.

After activating the workspace (`switchToOrganization` for a created team, or
`switchToPersonal` when a personal workspace exists), `finish()` navigates **directly** to the
resolved target via `resolveRootTarget(post-switch context)` — no bounce through the `/`
resolver (which would re-fetch `me/context` and add a second redirect, flashing `/login` /
`/onboarding` in between). The personal switch is gated on the concrete `personalOrganizationId`
so a personal-enabled-but-unprovisioned user never fires a 404-ing `switch-to-personal`
(core-be self-heals the missing personal org; the FE stays defensive). Modes: **team-only**
creates + lands on the team dashboard; **personal-only** / **personal-and-team** land on
`/dashboard`; a genuinely workspace-less state defers to `/` rather than self-looping.

## State

Wizard progress (current step, collected data, and `createdOrganizationId`) lives in
`useOnboardingStore` (Zustand, persisted to `localStorage`) so a refresh resumes mid-flow.
Server writes (create org, invitations, profile) go through the normal API layer, not the store.
