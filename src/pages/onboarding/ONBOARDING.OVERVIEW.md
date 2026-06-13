# `pages/onboarding` — Post-signup onboarding wizard

Route: `/onboarding`. Where a freshly authenticated user with **no organization** lands
(redirect enforced in `app/routes/routeTree.tsx`).

## Files

| File                     | Responsibility                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onboarding.route.tsx`   | Route marker — exports `Component` rendering `OnboardingPage`.                                                                                                                                                                                                           |
| `onboarding.manifest.ts` | Page manifest (`path: '/onboarding'`, `testId`, `kind: leaf`).                                                                                                                                                                                                           |
| `OnboardingPage.tsx`     | Multi-step wizard (welcome → profile → questions → workspace → invite → done). Reads/writes progress from `@/shared/store/useOnboardingStore/` so a refresh resumes mid-flow. On finish it creates the org, sends invitations, and redirects to the new org's dashboard. |

Step UIs live in `components/` (folder-per-unit): `WelcomeStep`, `ProfileStep`,
`QuestionsStep` (optional team-size / use-case / referral chips), `WorkspaceStep` (org name +
live `core.app/<slug>` preview, work-email-domain prefill), `InviteStep` (validated teammate
emails), `DoneStep`, plus `StepIndicator`.

## Finish flow (idempotent + best-effort)

`finish()` is safe to retry. The created org id is stashed in the store the moment creation
succeeds, so a retry after a partial failure **reuses** it instead of creating a duplicate.
Invitations are sent with `Promise.allSettled` — a single bad address never strands the user;
failures are surfaced as a toast and resendable from Members. Profile (name + job title) and
the qualifying-question answers are persisted **best-effort** (`authApi.updateProfile` +
a PostHog `onboarding_completed` segmentation event) and never block dashboard entry.

## State

Wizard progress (current step, collected data, and `createdOrganizationId`) lives in
`useOnboardingStore` (Zustand, persisted to `localStorage`) so a refresh resumes mid-flow.
Server writes (create org, invitations, profile) go through the normal API layer, not the store.
