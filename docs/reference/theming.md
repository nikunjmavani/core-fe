# Theming

The app is themed entirely through CSS custom properties (design tokens) declared
with Tailwind v4's `@theme` directive in `src/index.css`. Every component uses
**semantic tokens** (`bg-background`, `text-primary`, `border-border`, …) and
never raw palette classes — `pnpm validate:tokens` enforces this. A new theme is
therefore just a different set of token values; no component changes.

## shadcn-create compatible

A theme exported from [ui.shadcn.com/create](https://ui.shadcn.com/create) (or
the shadcn theme editors) is a block of CSS variables. Our token set is a
**superset** of shadcn's, with one naming difference: shadcn emits bare
`--background` / `--primary` / `--radius`, while our `@theme` uses the `--color-`
prefix (`--color-background`, `--color-primary`) and `--radius-{sm,md,lg,xl}`.

### Adopting a generated theme

1. Generate/copy the theme (its `:root { … }` light block + `.dark { … }` block).
2. Map names — prefix the color vars with `--color-`:

   | shadcn-create                                | this app                                            |
   | -------------------------------------------- | --------------------------------------------------- |
   | `--background` / `--foreground`              | `--color-background` / `--color-foreground`         |
   | `--primary` / `--primary-foreground`         | `--color-primary` / `--color-primary-foreground`    |
   | `--secondary*` `--muted*` `--accent*`        | `--color-secondary*` `--color-muted*` …             |
   | `--destructive` / `--destructive-foreground` | `--color-destructive*`                              |
   | `--card*` / `--popover*`                     | `--color-card*` / `--color-popover*`                |
   | `--border` / `--input` / `--ring`            | `--color-border` / `--color-input` / `--color-ring` |
   | `--sidebar*` (incl. `--sidebar-primary*`)    | `--color-sidebar*`                                  |
   | `--chart-1` … `--chart-5`                    | `--color-chart-1` … `--color-chart-5`               |
   | `--radius`                                   | `--radius-lg` (sm/md/xl derive around it)           |

3. Paste the mapped values into the `@theme` block (light) and the `.dark`
   override in `src/index.css`. Keep OKLCH — the generators emit it and it is the
   project's color space.
4. Run `pnpm validate:tokens` and do a visual pass in both light and dark.

The app's extra semantic tokens — `success` / `warning` / `info` (+ foregrounds),
`brand`, `overlay` — have no shadcn equivalent; pick values that fit the palette.

## Presets & runtime switching

Named presets are applied via a `data-theme="<id>"` attribute on `<html>`,
composed with the `.dark` class — so light/dark **mode** and the **preset** are
independent axes. A runtime switcher (Settings → Appearance) sets both.

Settings → Appearance is a shadcn-create-style studio with a per-axis picker for
each part of the look. **Generated look** axes (stored in `customTheme`): accent
and chart hue (`ACCENT_COLORS`), harmony (`HARMONY_RULES`), accent intensity
(`ACCENT_INTENSITIES`), body + heading font (`GENERATED_FONTS`), corner radius
(`GENERATED_RADII`), shape language, type scale, density, motion, elevation,
contrast, separation, and focus ring. **Orthogonal** axes (separate store fields):
base colour (`BASE_COLORS`), menu style (`MENU_STYLES`), icon weight, and icon
library — plus light/dark mode and named presets. All catalogs live in
`src/shared/theme/presets.ts`.

The **"Shuffle theme"** action does _not_ cycle the named presets — it
**generates a fresh full look** each click from a 32-bit seed: accent hue, chart
anchor, fonts, radius, and every generated experience axis above, plus optional
rolls on base/menu/icons. The accent drives the same tokens a preset overrides
(`--color-primary` / `--color-ring` / `--color-sidebar-primary` /
`--color-sidebar-ring` + foregrounds) and the chart anchor spreads into
`--color-chart-1..5` using the active harmony rule. Everything is set **inline**
on `<html>` so it works in both light and dark (CSP-safe — no injected `<style>`,
and fonts are **web-safe stacks** only since the CSP is `font-src 'self'`),
mutually exclusive with the `data-theme` presets. The store records it as
`preset: 'custom'` + `customTheme: GeneratedTheme`, so it persists across reloads.
Share via `?theme=<seed>`. Shuffle also rolls the orthogonal **icon axes**
(`shuffleIcons`): ~50% of clicks pick a new icon weight and ~35% swap the icon
library.

**Orthogonal axes** apply on top of any preset or generated look and persist
independently:

- **Base colour** (`data-base`; `neutral` = no attribute): `neutral`, `stone`,
  `slate`, `olive`, `zinc`, `warm` — tints neutral surfaces via mode-correct CSS
  blocks.
- **Menu style** (`data-menu`): `default`, `translucent`, `glass` — glassy
  dropdowns/popovers/selects.
- **Icon weight** (`--icon-stroke`): `thin`, `regular`, `bold` — Lucide/Tabler
  stroke width (Phosphor ignores it).
- **Icon colour** (`data-icon-color`): `default`, `foreground`, `muted`, `primary`,
  `accent`, `destructive` — semantic token mapping for app icons.
- **Icon library**: `lucide`, `tabler`, `phosphor` — lazy-loaded swap via
  `@/shared/icons`.

When `VITE_THEME_LOCK=true`, the switcher and shuffle are hidden and the app is
pinned to the code-defined theme.

## Icon library (swappable at runtime, lazy-loaded)

Every app icon flows through the `@/shared/icons` barrel (eslint-enforced — see
`eslint.config.mjs`; Lucide/Tabler/Phosphor are banned outside it). Each export
is a thin wrapper that renders the **active** library's version, read from
`useThemeStore().iconLibrary`:

- **Lucide** is the default, statically imported in the barrel → tree-shaken into
  the main bundle (only the ~50 icons we use). So the initial bundle is unchanged
  whether or not the feature exists.
- **Tabler** and **Phosphor** live in `iconset-tabler.ts` / `iconset-phosphor.ts`
  — curated `Record<IconName, AppIcon>` maps that are **dynamically imported**
  (`icon-registry.ts`) only when selected, as their own lazy chunks (~4 KB /
  ~32 KB gz). Until a chunk arrives the barrel falls back to Lucide, so there's
  no flash of missing icons. `ICON_NAMES` is the canonical key list; the
  `Record<IconName, …>` typing guarantees every set covers exactly the same icons.
- Vendored shadcn primitives (`components/ui`) import Lucide directly and **always
  stay Lucide** — only app-code icons swap.

Adding a library: install it, add `iconset-<lib>.ts` (map all `ICON_NAMES`), add
a `loadModule` branch in `icon-registry.ts` and an entry in `ICON_LIBRARIES`.

## Theme axis audit playbook

When making the UI respect every Appearance / Shuffle axis (corner radius, elevation,
density, etc.), follow the repeatable procedure in
**[theme-axis-audit-playbook.md](theme-axis-audit-playbook.md)** — full preset catalog,
status tracker, grep cheatsheet, and the steps used for the radius/shape pass.

**Agents:** read **`agent-os/skills/theme-axis-audit/SKILL.md`** and
**`agent-os/rules/theme-axis-audit.mdc`** before any axis cycle (one axis per cycle,
detailed report required).

**Product-design floors (typography, density, touch, motion):**
**[preset-product-design-rules.md](preset-product-design-rules.md)** — industry-backed
rules mapped to every axis; **`agent-os/rules/preset-product-design.mdc`** for agents.

## Expanded catalog (2025-06 audit)

Full axis list and status: **[theme-axis-audit-playbook.md](theme-axis-audit-playbook.md)**.
Post-audit follow-up: **[theme-axis-follow-up-plan.md](theme-axis-follow-up-plan.md)**.

| Axis             | Attribute / store                            | Options (from `presets.ts`)                                                     |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Named preset     | `data-theme` / `preset`                      | default, violet, emerald, rose, ocean, custom                                   |
| Mode             | `.dark` class / `theme`                      | light, dark, system                                                             |
| Accent hue       | inline / `customTheme.hue`                   | rose, orange, amber, lime, emerald, teal, blue, violet, pink (+ continuous hue) |
| Chart harmony    | `harmonyId`                                  | monochromatic, analogous, complementary, split, triadic                         |
| Accent intensity | `intensityId`                                | subtle, muted, balanced, vibrant, max                                           |
| Base neutral     | `data-base` / `baseId`                       | neutral, stone, slate, olive, zinc, warm                                        |
| Menu surface     | `data-menu` / `menu`                         | default, translucent, glass                                                     |
| Radius           | `radiusId`                                   | sharp, default, rounded, round                                                  |
| Shape            | `data-shape` / `shapeId`                     | uniform, mixed, pill, sharp                                                     |
| Type scale       | inline `--text-*` / `typeScaleId`            | tight, compact, default, grand, display                                         |
| Elevation        | `data-elevation` / `elevationId`             | flat, soft, lifted, floating                                                    |
| Contrast         | `data-contrast` / `contrastId`               | normal, soft, crisp, dim, amoled                                                |
| Separation       | `data-separation` / `separationId`           | border, hairline, shadow                                                        |
| Density          | inline `--spacing` / `densityId`             | compact, cozy, relaxed, airy                                                    |
| Layout width     | store `layoutWidth` / `VITE_LAYOUT_WIDTH`    | contained (standard), full, reading                                             |
| Motion           | inline `--default-transition-*` / `motionId` | instant, calm, smooth, snappy (+ OS reduce → instant)                           |
| Focus ring       | `data-focus` / `focusId`                     | ring, glow, offset, underline, inset                                            |
| Toast variant    | store `toastVariant` (index)                 | tint, solid, outline, accent, minimal, glass (TEMP preview)                     |
| Toast position   | store `toastPosition`                        | top-right, top-center, top-left, bottom-right, bottom-center, bottom-left       |
| Icon weight      | `--icon-stroke` / `iconWeight`               | thin, regular, bold                                                             |
| Icon colour      | `data-icon-color` / `iconColor`              | default, foreground, muted, primary, accent, destructive                        |
| Icon library     | lazy chunk / `iconLibrary`                   | lucide, tabler, phosphor                                                        |

Generated / shuffled looks set accent hue, chart harmony, fonts, radius, and all
experience axes via inline CSS vars (`applyGeneratedTheme` in `shared/theme/presets.ts`).
Named presets and generated looks are mutually exclusive (`data-theme` vs inline vars).

`pnpm validate:theme-catalog` fails if `design.md` / `theming.md` drift from
`presets.ts` (assertions in `src/shared/theme/catalog-doc.ts`).

## Compliance gate

`pnpm validate:theme-axis` scans app code (excluding vendored `ui/` and tests) for:

- Hardcoded Tailwind shadows (`shadow-sm` … `shadow-2xl`)
- Hardcoded focus rings (`focus-visible:ring`, `focus:ring`)
- Direct `lucide-react` imports outside the icon barrel
- `bg-card` / `bg-popover` without a nearby `data-slot=` marker

Allowlisted exceptions live in `tooling/validate/theme-axis-allowlist.txt`. The gate
runs in `pnpm health` (phase 8b) after `validate:tokens`.

**Catalog doc sync:** `pnpm validate:theme-catalog` ensures `design.md` and
`theming.md` list the same axis options as `presets.ts` (assertions in
`catalog-doc.ts`). Runs in the same health phase and PR `static-sync` job.

## Readability & route motion

These rules prevent “invisible UI” when themes or motion settings change:

| Rule                                                                   | Where enforced                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `text-card-foreground` on card surfaces                                | `Card` primitive + custom dashboard/card markup                |
| Minimum `text-xs` for product labels/hints                             | `agent-os/rules/tailwind-styling.mdc`, `design.md` §2          |
| Page transitions use **transform-only** `route-rise` (no opacity fade) | `src/index.css` (`--animate-fade-in-up`), `PageTransition.tsx` |

Do not add opacity-based entrance animations to layout outlets or `PageTransition` —
`animation-fill-mode: both` can leave primary copy at `opacity: 0` when reduced
motion zeroes duration. See `design.md` §5 Motion.
