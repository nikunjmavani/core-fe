# PWA manifest and app icon

Single source of truth for install surface metadata, browser chrome colors, and
brand icons. Keeps the PWA manifest aligned with the default theme preset and
`index.html` meta tags.

**Skill:** `agent-os/skills/pwa-manifest/SKILL.md`  
**Rule:** `agent-os/rules/pwa-manifest-sync.mdc` (auto-attaches on matched paths)

---

## Architecture

```text
src/core/config/app-manifest.ts     ← edit here first (constants + buildWebManifest())
public/manifest.webmanifest         ← committed JSON mirror (drift-guarded by test)
public/app-icon.svg                 ← Lucide Boxes brand mark (#0a0a0a tile)
public/pwa-192x192.png              ← generated from SVG
public/pwa-512x512.png              ← generated from SVG (also maskable in manifest)
index.html                          ← favicon, theme-color, manifest link
vite.config.ts (VitePWA)            ← includeAssets, manifest: false (static file)
src/lib/routes/page-head.ts         ← APP_TITLE, APP_DESCRIPTION (shared copy)
```

**Do not** hand-edit `public/manifest.webmanifest` without updating
`app-manifest.ts` — CI fails when they diverge (`app-manifest.test.ts`).

---

## Rules (must follow)

### 1. Source of truth order

1. Change **`src/core/config/app-manifest.ts`** (colors, names, icons, shortcuts).
2. Regenerate or update **`public/manifest.webmanifest`** to match
   `JSON.stringify(buildWebManifest(), null, 2)` (or run the test and copy from
   failure output).
3. Sync related surfaces in the same change:
   - **`index.html`** — `<meta name="theme-color">`, `<meta name="description">`,
     `<link rel="icon">`, manifest href unchanged (`/manifest.webmanifest`).
   - **`src/lib/routes/page-head.ts`** — `APP_DESCRIPTION` must equal
     `APP_MANIFEST_DESCRIPTION`.
   - **`vite.config.ts`** — `VitePWA` `includeAssets` lists every icon path served
     offline.
4. Run **`pnpm test:unit src/core/config/app-manifest.test.ts`** — drift guard
   must pass.

### 2. Colors align with default preset

| Field                    | Constant                               | Must match                                                               |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------ |
| `background_color`       | `APP_MANIFEST_BACKGROUND_COLOR`        | Light `--color-background` in `src/index.css` (`#ffffff` / oklch(1 0 0)) |
| `theme_color`            | `APP_MANIFEST_THEME_COLOR`             | Brand tile / shell chrome (`#0a0a0a` — same as AuthLayout / splash)      |
| `index.html` theme-color | same hex as `APP_MANIFEST_THEME_COLOR` | Browser UI chrome                                                        |

When default preset background or primary changes in `index.css` or
`docs/reference/preset-product-design-rules.md`, update manifest constants in the
**same PR**.

### 3. App icon (Boxes)

- **SVG:** `public/app-icon.svg` — Lucide **Boxes** on `#0a0a0a` tile (matches
  AuthLayout / FullPageSpinner brand mark).
- **PNG regeneration** (after SVG changes):

```bash
rsvg-convert -w 192 -h 192 public/app-icon.svg -o public/pwa-192x192.png
rsvg-convert -w 512 -h 512 public/app-icon.svg -o public/pwa-512x512.png
```

Use `rsvg-convert` (macOS `sips` does not reliably rasterize this SVG).

- **Paths:** export via `APP_ICON_PATHS` in `app-manifest.ts`; manifest `icons[]`
  must reference existing files under `public/`.
- **Do not** reintroduce `vite.svg` as favicon or manifest icon.

### 4. Copy and naming

| Field         | Source                                                        |
| ------------- | ------------------------------------------------------------- |
| `name`        | `APP_TITLE` from `page-head.ts` (`"Core Admin"`)              |
| `short_name`  | `APP_MANIFEST_SHORT_NAME` (`"Core"`)                          |
| `description` | `APP_MANIFEST_DESCRIPTION` — same string in `index.html` meta |

User-facing copy changes go through **i18n** for in-app UI; manifest strings stay
English (`lang: en-US`) unless product explicitly adds localized manifests.

### 5. VitePWA

- Manifest is **static** (`manifest: false` in plugin — file lives in `public/`).
- `includeAssets` must list: `app-icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`,
  plus other offline-critical assets (`offline.html`, etc.).
- Do not duplicate manifest JSON inside `vite.config.ts`.

### 6. Validation

```bash
pnpm validate:public          # required files exist (public-assets.sh)
pnpm test:unit src/core/config/app-manifest.test.ts
pnpm build                    # PWA precache includes icons
```

---

## Checklist (agent / PR)

- [ ] Edited `app-manifest.ts` first
- [ ] `public/manifest.webmanifest` matches `buildWebManifest()`
- [ ] `index.html` theme-color + description synced
- [ ] `page-head.ts` `APP_DESCRIPTION` synced
- [ ] PNGs regenerated if SVG changed
- [ ] `vite.config.ts` `includeAssets` updated if paths changed
- [ ] `public/README.md` inventory accurate
- [ ] `app-manifest.test.ts` passes

---

## Related

- [local-production-perf.md](./local-production-perf.md) — measure bundle/Lighthouse on production build
- [theming.md](./theming.md) — appearance axes (manifest colors = default preset only)
- [preset-product-design-rules.md](./preset-product-design-rules.md) — global default colors
- [frontend-platform.md](./frontend-platform.md) — `startVersionCheck`, offline stance
- [../../public/README.md](../../public/README.md) — static asset inventory
