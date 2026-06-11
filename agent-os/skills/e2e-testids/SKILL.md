---
name: e2e-testids
description: Add and maintain data-testid attributes for Playwright E2E and stable selectors. Use when scaffolding UI, preparing E2E specs, auditing test hooks, or when the user asks for test ids on elements.
---

# E2E Test IDs (`data-testid`)

Single source of truth for **Playwright-ready selectors** in core-fe. Use **`data-testid`** (not HTML `id`) on every element you expect to target in E2E or component tests.

## Triggers

- User asks for "test ids", "e2e selectors", "data-testid", or "ids for playwright"
- New page, form, dialog, table, or nav item is added
- Before writing or extending `tests/e2e/*.spec.ts`
- Page scaffolding or auto-implement completes UI work

## Rules

1. **Attribute:** `data-testid="kebab-case"` only — never rely on CSS classes, copy text, or DOM order in E2E.
2. **Scope:** Page root, forms, inputs, buttons, links, tabs, tables, dialogs, error/empty/loading states, and primary nav items.
3. **Stability:** IDs describe **role + context**, not visual copy (`login-submit` not `sign-in-button`).
4. **Forms:** Prefer `<form>-<field>` for inputs and `<form>-submit` for submit. API errors: `<form>-error` (login uses `login-error` for historical E2E).
5. **Do not** add testids to shadcn primitives in `shared/components/ui/` unless wrapping in a page-specific component.
6. **Inventory:** After adding or renaming testids on a route, update `docs/reference/e2e-testids-inventory.md`.

## Naming patterns

| Element              | Pattern                                 | Example                           |
| -------------------- | --------------------------------------- | --------------------------------- |
| Page container       | `<route>-page`                          | `dashboard-page`                  |
| Page heading         | `<route>-heading` or `<route>-greeting` | `dashboard-greeting`              |
| Layout shell         | `<layout>-layout`                       | `auth-layout`, `dashboard-layout` |
| Form wrapper         | `<form>-form`                           | `login-form`                      |
| Form field           | `<form>-<field>`                        | `login-email`                     |
| Submit               | `<form>-submit`                         | `register-submit`                 |
| API / server error   | `<form>-error`                          | `login-error`, `form-error`       |
| Field validation     | `<form>-<field>-error`                  | `login-email-error`               |
| Link (auth switch)   | `<context>-link-<action>`               | `login-link-sign-up`              |
| Nav (sidebar/mobile) | `nav-<slug>`                            | `nav-dashboard`, `nav-settings`   |
| Tab                  | `<section>-tab-<slug>`                  | `team-tab-members`                |
| Card / widget        | `<name>-card` or `<name>-section`       | `team-section`                    |
| Stat                 | `stat-card-<slug>`                      | `stat-card-users`                 |
| Dialog               | `<name>-dialog`                         | `create-org-dialog`               |
| Table                | `<name>-table`                          | `members-table`                   |
| Loading              | `<context>-loading`                     | `accept-invite-loading`           |

**Slug rule:** lowercase, hyphens only; derive from route path (`/organization/members` → `organization-members` when needed).

## Workflow

### Adding testids to new UI

1. Add `data-testid` on the **outermost** testable node (page `div`, form `div`, `Card`, `Button`, `Link`, `Input`).
2. Mirror names in colocated unit tests (`screen.getByTestId(...)`).
3. Append the route section in `docs/reference/e2e-testids-inventory.md`.
4. Write Playwright spec using `page.getByTestId('...')`.

### Playwright usage

```ts
await page.goto('/login');
await expect(page.getByTestId('login-form')).toBeVisible();
await page.getByTestId('login-email').fill('user@example.com');
await page.getByTestId('login-submit').click();
await expect(page.getByTestId('login-error')).toBeVisible();
```

Prefer `getByTestId` over `getByRole` in E2E **only where testids exist**; use role queries for a11y specs when testids are absent.

### Checklist (every new page)

- [ ] `<name>-page` on root
- [ ] Primary heading or greeting testid
- [ ] All form fields + submit + error states
- [ ] Primary CTAs and nav links used in flows
- [ ] Tabs, tables, dialogs referenced in acceptance criteria
- [ ] Inventory doc updated
- [ ] E2E spec stub in `tests/e2e/` (optional until flow is ready)

## Related

| Resource                     | Path                                        |
| ---------------------------- | ------------------------------------------- |
| Test ID inventory (by route) | `docs/reference/e2e-testids-inventory.md`   |
| Unit test + testid rules     | `agent-os/rules/testing-requirements.mdc`   |
| Page scaffold defaults       | `agent-os/skills/page-scaffolding/SKILL.md` |
| E2E specs                    | `tests/e2e/`                                |
| E2E auth helper              | `tests/utils/e2e-auth.ts`                   |

## Auto-invocation

- **page-scaffolding** and **auto-implement** must apply this skill for all interactive UI.
- **test-generation** cross-references naming here; form templates must match live testids.
- When user says "add e2e later", still add testids in the same PR as the UI.
