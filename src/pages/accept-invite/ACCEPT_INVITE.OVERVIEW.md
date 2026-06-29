# `pages/accept-invite` — Membership invitation acceptance

Route: `/accept-invite/$invitationId`. Public entry point a user reaches from an invite
email link.

## Files

| File                        | Responsibility                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accept-invite.route.tsx`   | Route marker — exports `Component` rendering `AcceptInvitePage`.                                                                                                                    |
| `accept-invite.manifest.ts` | Page manifest (`path: '/accept-invite/$invitationId'`, `testId`, `kind: leaf`, no permission).                                                                                      |
| `AcceptInvitePage.tsx`      | Calls `acceptInvitation(invitationId)`, refreshes the session, sets the active tenant, and redirects to the dashboard. Shows loading / error states for invalid or expired invites. |

## Flow

1. Read `invitationId` from the route params.
2. Accept the invitation (server resolves the org + role).
3. Auto-login the user (no separate sign-in step).
4. Set tenant context and navigate to `/`.
