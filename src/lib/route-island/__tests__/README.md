# Route island `__tests__/` (template)

Copy this folder into each `pages/<page-name>/` and `pages/.../sub-pages/<sub-page-name>/`.

```text
__tests__/
├── unit/                    # Vitest — fast, isolated
│   ├── components/          # mirrors ../components/
│   ├── hooks/               # mirrors ../hooks/
│   ├── forms/               # mirrors ../forms/
│   ├── api.test.ts
│   ├── page.test.tsx        # main page/layout component
│   └── search.test.ts
├── integration/             # optional — island flows with MSW/providers
└── e2e/                     # optional — thin wrappers; prefer project tests/e2e/
```

**Import sources** from parent island using relative paths (e.g. `__tests__/unit/components/Foo.test.tsx` → `../../../components/Foo.tsx`).

**Project E2E** stays in `tests/e2e/` at repo root; link in island `OVERVIEW.md`.
