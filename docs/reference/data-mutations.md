# Data Mutations — Optimistic Updates & Write UX

How write mutations behave in core-fe: when a mutation patches the cache
**optimistically** (instant UI, auto-rollback) versus when it stays
**non-optimistic** (waits on the server and must show an **in-progress** state).

All write mutations go through `useAppMutation`
([`src/shared/hooks/useAppMutation`](../../src/shared/hooks/useAppMutation)), which
owns the toast + invalidation + optional optimistic patch in one place. Server
state is never mirrored into Zustand — TanStack Query is the single owner.

## Policy (what we follow going forward)

Every new write mutation picks exactly one of two modes:

| Mode               | Use when…                                                                                                                              | Requirement                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Optimistic**     | The change is a **safe in-place patch** of an already-cached list: a **removal** (filter by `id`) or a **field update** (map by `id`). | Use `useAppMutation`'s `optimistic` config. Auto-rolls back on error. Reconciles via `invalidateKeys`.                             |
| **Non-optimistic** | **Creates** (need a temp id + server-id reconciliation), or any shape we can't safely guess.                                           | **Must surface an in-progress state** — wire `mutation.isPending` to a disabled button + spinner. Reconciles via `invalidateKeys`. |

Rules that always hold:

- **Never leave a write with no feedback.** Optimistic = the row changes
  instantly; non-optimistic = the trigger shows `isPending`. One or the other.
- **Optimistic is for removals and field-patches only.** Do **not** optimistically
  insert created rows — the temp-id/real-id swap is error-prone (ghost/duplicate
  rows). Creates are non-optimistic + in-progress.
- **Errors always surface.** `useAppMutation` maps the error to a toast; optimistic
  mutations additionally restore the pre-mutation snapshot so the UI never lies
  after a failed write.
- **Reconcile, don't trust the guess.** Always pass `invalidateKeys` so the
  server's truth replaces the optimistic patch on success.

## The `optimistic` API

```ts
export function useRevokeApiKey() {
  return useAppMutation({
    mutationFn: (keyId: string) => orgApi.revokeApiKey(keyId),
    invalidateKeys: [orgQueryKeys.apiKeys()],
    optimistic: {
      queryKey: orgQueryKeys.apiKeys(),
      // (previousCache, vars) => nextCache
      update: (previous: ApiKey[] | undefined, keyId) =>
        previous?.filter((key) => key.id !== keyId),
    },
    successMessage: i18n.t(/* … */),
  });
}
```

Lifecycle: **cancel** in-flight refetches → **snapshot** the cache → **patch** it
→ on error **restore the snapshot** → on success **invalidate** to reconcile.

## In-progress for non-optimistic writes

Every mutation hook returns TanStack Query's `isPending`. Non-optimistic triggers
**must** consume it:

```tsx
<Button
  type="submit"
  disabled={createInvitation.isPending}
  isLoading={createInvitation.isPending}
>
  {createInvitation.isPending ? t('common.sending') : t('invite.send')}
</Button>
```

## Current inventory (snapshot — 2026-06-29)

**Optimistic** (instant, auto-rollback) — all safe removals + field-patches:

| Domain        | Mutation                                 |
| ------------- | ---------------------------------------- |
| Invitations   | `useRevokeInvitation`                    |
| Roles         | `useUpdateRole`, `useDeleteRole`         |
| API keys      | `useRenameApiKey`, `useRevokeApiKey`     |
| Members       | `useUpdateMemberRole`, `useRemoveMember` |
| Sessions      | `useRevokeSession`                       |
| Passkeys      | `useRemovePasskey`                       |
| Webhooks      | `useDeleteWebhook`                       |
| Notifications | `useMarkNotificationRead`                |

**Non-optimistic** (must show in-progress) — creates + shapes we can't safely patch:

- **Creates:** `useCreateInvitation`, `useCreateRole`, `useCreateApiKey`, `useCreateWebhook`, `useRegisterPasskey`
- `useResendInvitation` (no list change), `useUpdateMemberStatus`
- `useMarkAllNotificationsRead`, `useUpdateNotificationPreferences`, `useUpdateOrganization`, billing/MFA

> The inventory drifts as hooks are added — the **policy** above is the durable
> contract. When adding or changing a mutation, classify it and update this table.

## Testing requirement

Optimistic mutations carry a real failure-mode risk: a broken rollback would leave
a failed write looking applied. So any optimistic path must be covered by:

1. **patch-kept-on-success** — the cache reflects the patch after the request resolves.
2. **rollback-on-error** — the cache returns to its exact pre-mutation state, and the error toast fires.

The shared mechanism is tested in
[`useAppMutation.test.tsx`](../../src/shared/hooks/useAppMutation/useAppMutation.test.tsx);
hook-specific cache shapes should be covered in the hook's own test.

## Related

- `agent-os/rules/api-data-patterns.mdc` — data-layer patterns (this is the canonical detail).
- `agent-os/skills/http-forms-errors/SKILL.md` — form mutation + error UX checklist.
- [`reference/frontend-platform.md`](frontend-platform.md) — platform kernel (queryClient defaults).
