---
name: http-forms-errors
description: Form mutations, API error mapping, and read-path error UX in core-fe — mapValidationErrors + RHF, 429 RateLimitNotice, notifyError, QueryBoundary. Use when wiring forms to apiClient mutations or server-state panels.
---

# HTTP, forms & errors (core-fe)

Use this skill when connecting **react-hook-form + Zod** mutations to **`apiClient`**, or
when choosing how **read vs write** paths surface failures.

**Data fetching patterns:** `react-best-practices` + `agent-os/rules/api-data-patterns.mdc`  
**Platform overview:** `docs/reference/frontend-platform.md` (HTTP errors, QueryBoundary, offline stance)

---

## Decision tree

| Path                       | Pattern                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Mutation (form submit)** | Client Zod → `apiClient` → map 422 to fields → toast for unmapped errors                |
| **429 on mutation**        | `RateLimitNotice` inline or above form — not a silent retry loop                        |
| **401**                    | Never catch in component — fetch client interceptor refreshes once then `forceLogout()` |
| **Read (panel/widget)**    | `QueryBoundary` at panel boundary — no inline `isLoading`/`isError` duplication         |
| **Offline**                | Online-first — show error + retry; no silent write queue                                |

---

## Checklist — form mutation

1. **Schema** — Zod in `<page>.contracts.ts`; `zodResolver` on the form.
2. **Submit handler** — TanStack Query `useMutation` or explicit `mutationFn` calling `<page>.api.ts` via `apiClient`.
3. **422 mapping** — in `onError`:

```tsx
import { mapValidationErrors } from '@/lib/forms/map-validation-errors.ts';
import { notifyError } from '@/shared/errors/errorHandler.ts';

onError: (error) => {
  if (mapValidationErrors(error, form.setError)) return;
  notifyError(error);
},
```

4. **Form root errors** — unmapped server message on `data-testid="form-error"` when appropriate.
5. **429** — if the form can hit rate limits (auth, invite, public endpoints):

```tsx
import { RateLimitNotice } from '@/shared/components/RateLimitNotice/index.ts';

<RateLimitNotice error={mutation.error} onDismiss={…} />
```

Helpers: `shared/errors/rate-limit.ts` (`isRateLimitError`, `getRateLimitRetryAfterSeconds`).

6. **Success** — invalidate query keys; close dialog or navigate per UX spec.
7. **Idempotency** — fetch client attaches `Idempotency-Key` on writes automatically — do not disable.
8. **Tests** — colocated form test: 422 maps to field; 429 shows notice; axe clean.

---

## Checklist — read path (QueryBoundary)

1. Parent holds `useQuery` / hook; wrap render in `QueryBoundary`.
2. Pass typed `data` via render-prop to child — no duplicate skeleton/error branches.
3. Mutations stay **outside** the boundary.
4. Custom `loading=` / `errorMessage=` only when defaults are wrong for the layout.

Migrated reference panels: Settings org/account panels, dashboard widgets.

---

## Error mapping reference

| Status | Handler                                                            |
| ------ | ------------------------------------------------------------------ |
| 401    | Interceptor only                                                   |
| 422    | `mapValidationErrors` → RHF `setError`                             |
| 429    | `RateLimitNotice` + fetch-client retry policy for idempotent reads |
| Other  | `notifyError` / `mapApiError` via `errorHandler.ts`                |

`ValidationError` and `HttpError` 422 bodies support nested `error.fields` / `field_errors`.

---

## Anti-patterns

- Catching 401 in components or mutations
- Toast-only for field-level validation when 422 body has field keys
- Inline `isLoading && <Skeleton>` + `isError && <p>` when `QueryBoundary` fits
- Raw `fetch` for domain APIs (use `apiClient`; auth paths excepted)
- Storing mutation errors only in Zustand

---

## Verify

```bash
pnpm tsc
pnpm test -- --run src/lib/forms/ src/shared/components/RateLimitNotice/ src/shared/errors/
```

---

## Related

- Skills: `composition-patterns`, `test-generation`, `resource-crud`
- Components: `QueryBoundary`, `RetryError`, `OfflineIndicator`
- Rule: `agent-os/rules/api-data-patterns.mdc`
