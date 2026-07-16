# Internationalization (i18n) — Core Frontend

Client-side copy uses **react-i18next** (aligned with core-be's i18next). Backend API messages are still displayed as returned — no client translation layer for API errors.

```mermaid
flowchart LR
  subgraph fe["Frontend"]
    CONST["`<page>`.constants.ts` keys + IDs"]
    JSON["`src/locales/en/<ns>.json`"]
    COMP["Components `t(key)`"]
    CONST --> COMP
    JSON --> COMP
  end
  subgraph be["Backend"]
    BE["i18next API messages"]
  end
  BE -->|as-is| User[User]
  COMP --> User
```

---

## Current status

- **Stack:** `i18next` + `react-i18next` — bootstrap in `src/lib/i18n/i18n.ts`, provider in `AppProviders`.
- **Build modes (`BUILD_I18N_MODE`, build-time only):**
  - **`single`** (default) — Vite plugin inlines one locale (UI copy + regional profile: date/number/currency defaults) into JS; no separate JSON chunks in `dist`. Default locale: `BUILD_I18N_LOCALE=en-US`. Language/regional pickers hide at runtime.
  - **`multi`** — runtime loader in `load-namespace.ts`; English in the initial bundle, other locales lazy-load `src/locales/<lang>/*.json`.
- **Locales:** `src/locales/en/`, `es/`, `zh/` — namespaces: `common`, `layout` (shared shells), `auth`, `onboarding`, …
- **Layout chrome:** `AuthLayout`, `AppLayout`, and `PublicLayout` use `layout.constants.ts` + `useTranslation(LAYOUT_NS)` — nav labels, skip links, auth marketing copy, footer.
- **Regional prefs:** `useLocaleStore` — language, date/time format, hour cycle (12h/24h), number style, and currency display (`locale-preference` v5).
- **Formatting:** `useLocaleFormat()` / `<FormattedDate />` — locale-ordered datetime (day/month/year + hour:minute:second), date-only, time-only, relative time, numbers, currency.
- **Language picker:** right-edge floating handle via `FloatingEdgeControls` (multi builds only).

---

## Locale switching

1. User picks **language** and **date format** from the floating **Languages** handle.
2. `setLocale()` lazy-loads that locale's JSON chunks, then `i18n.changeLanguage()`.
3. `setDateFormat()` updates Intl output immediately (no extra fetch).
4. Preferences persist in `localStorage` (`locale-preference`).

To add another language:

1. Add `src/locales/<lang>/*.json` and register loaders in `load-namespace.ts`.
2. Add the code to `I18N_LOCALES` + `INTL_LOCALE` in `locales.ts` / `intl-config.ts`.
3. Add menu label keys under `language.*` in `common.json`.

---

## Key conventions

| Item           | Convention                                                     |
| -------------- | -------------------------------------------------------------- |
| Namespace      | Same name as route island folder (`onboarding`, `login`, …)    |
| Key paths      | Dot-separated, grouped by step/feature (`steps.welcome.title`) |
| Constants file | `<page>.constants.ts` exports `*_KEYS`, `*_TEST_IDS`, `*_NS`   |
| Components     | `useTranslation(ONBOARDING_NS)` + `t(ONBOARDING_KEYS.…)`       |
| Non-React      | `import i18n from '@/lib/i18n/i18n.ts'`                        |
| Rich text      | `<Trans ns={…} i18nKey={…} components={…} />`                  |
| Plurals        | `key_one` / `key_other` in JSON + `{ count }` in `t()`         |

---

## Adding strings to an island

1. Add the key to `<page>.constants.ts` under `*_KEYS`.
2. Add the English value to `src/locales/en/<page>.json`.
3. Use `t(key)` in components or `i18n.t(key, { ns })` elsewhere.
4. Agent workflow: **`agent-os/skills/i18n-constants/SKILL.md`**.

---

## White-label / single-locale builds

When `BUILD_I18N_MODE=single`, only one locale bundle ships — no runtime language
picker. Keys must still exist in `src/locales/en/<namespace>.json` (or the chosen
build locale) because constants files reference key paths, not inline copy.

**CI:** `pnpm validate:i18n` scans `*.constants.ts` files and fails when a
`*_KEYS` literal path is missing from the matching English namespace JSON.
Fix by adding the key to locale JSON before merging.

`pnpm validate:i18n-parity` complements it on the cross-locale axis: English is
the source of truth, **full** locales (`I18N_LOCALES` − `PARTIAL_UI_LOCALES` −
`en`) must carry every English key in every namespace, **partial** locales
(`PARTIAL_UI_LOCALES`) must carry every English `common` key (other namespaces
fall back to English by design), and no locale may hold a key English has
dropped. The locale sets are read from `src/lib/i18n/locales.ts`, so the gate
can't drift from the app config. Both run in PR CI (`static-sync` job) and in
the weekly `sync-drift-canary` via `pnpm sync:check`.

---

## Related

- [frontend-platform.md](./frontend-platform.md) — boot order, gateway, QueryBoundary, modules
- [constants-and-i18n.md](./constants-and-i18n.md) — file placement, rollout waves, manifest testId rule
- [tools-and-usage.md](./tools-and-usage.md) — package versions
