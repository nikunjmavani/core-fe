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

The **"Shuffle theme"** action (shadcn-create style) does _not_ cycle the named
presets — it **generates a fresh random accent** each click: a random hue drives
the same accent tokens a preset overrides (`--color-primary` / `--color-ring` /
`--color-sidebar-primary` + their foregrounds), set **inline** on `<html>` so it
works in both light and dark (CSP-safe — no injected `<style>`; mirrors the
org-brand engine), mutually exclusive with the `data-theme` presets. The store
records it as `preset: 'custom'` + `customHue`, so it persists across reloads and
the panel shows a live **Custom** swatch. When `VITE_THEME_LOCK=true`, the
switcher and shuffle are hidden and the app is pinned to the code-defined theme.
