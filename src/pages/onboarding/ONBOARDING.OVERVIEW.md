# `pages/onboarding` — Post-signup onboarding wizard

Route: `/onboarding`. Where a freshly authenticated user with **no organization** lands
(redirect enforced in `app/routes/routeTree.tsx`).

## Files

| File                     | Responsibility                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onboarding.route.tsx`   | Route marker — exports `Component` rendering `OnboardingPage`.                                                                                                                                                                                               |
| `onboarding.manifest.ts` | Page manifest (`path: '/onboarding'`, `testId`, `kind: leaf`).                                                                                                                                                                                               |
| `OnboardingPage.tsx`     | Multi-step wizard (profile → organization → invite team → done). Reads/writes progress from `@/shared/store/useOnboardingStore/` so a refresh resumes mid-flow. On finish it creates the org, sets tenant context, sends mock invites, and redirects to `/`. |

## State

Wizard progress (current step + collected data) lives in `useOnboardingStore` (Zustand,
persisted to `localStorage`). Server writes (create org, invitations) go through the normal
API layer, not the store.
