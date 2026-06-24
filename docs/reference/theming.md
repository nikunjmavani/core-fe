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
each part of the look: **accent colour** and **chart colour** (named hues from
`ACCENT_COLORS`), **base colour**, **body + heading font**, **radius**, **menu
style**, and **icon weight** — plus **Shuffle**.

The **"Shuffle theme"** action does _not_ cycle the named presets — it
**generates a fresh full look** each click: a random **accent hue**, **chart
anchor**, **body + heading fonts** (`--font-sans` / `--font-heading`), and
**corner radius** (the `--radius-sm/md/lg/xl` scale, derived from a base). The
accent drives the same tokens a preset overrides (`--color-primary` /
`--color-ring` / `--color-sidebar-primary` / `--color-sidebar-ring` +
foregrounds) and the chart anchor spreads into `--color-chart-1..5`. Everything
is set **inline** on `<html>` so it works in both light and dark (CSP-safe — no
injected `<style>`, and fonts are **web-safe stacks** only since the CSP is
`font-src 'self'`; mirrors the org-brand engine), mutually exclusive with the
`data-theme` presets. The store records it as `preset: 'custom'` +
`customTheme: { hue, chartHue, bodyFontId, headingFontId, radiusId }`, so it
persists across reloads. Catalogs live in `GENERATED_FONTS` / `GENERATED_RADII` /
`ACCENT_COLORS` (`shared/theme`).

**Three orthogonal axes** apply on top of any preset/look and persist
independently: **base colour** (`data-base='stone'|'slate'|'olive'`; `neutral` =
no attribute) tints the neutral surfaces via mode-correct CSS blocks — the one
exception to "neutrals stay neutral", done as predefined sets rather than a free
picker so light/dark both read right; **menu style** (`data-menu='translucent'`)
makes dropdowns/popovers/selects glassy; and **icon weight** drives every Lucide
icon's `stroke-width` through the `--icon-stroke` var (`svg.lucide` rule). A true
multi-library icon swap was scoped out — icons are statically bundled, so that
is a build-time choice, not a runtime token. When `VITE_THEME_LOCK=true`, the switcher
and shuffle are hidden and the app is pinned to the code-defined theme.
