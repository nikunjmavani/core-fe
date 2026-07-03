import { APP_TITLE } from '@/lib/routes/page-head.ts';

/**
 * PWA / install surface — aligned with the default product preset in
 * `src/index.css` (@theme light: `--color-background`, `--color-primary`) and
 * `docs/reference/preset-product-design-rules.md` global defaults.
 *
 * `public/manifest.webmanifest` must stay in sync — guarded by
 * `app-manifest.test.ts`.
 */
export const APP_MANIFEST_SHORT_NAME = 'Core';

/** Matches index.html `<meta name="description">` and manifest `description`. */
export const APP_MANIFEST_DESCRIPTION = 'Enterprise multi-tenant admin dashboard';

/** Light-mode `--color-background` (oklch(1 0 0)). */
export const APP_MANIFEST_BACKGROUND_COLOR = '#ffffff';

/** Shell / browser chrome — matches index.html `theme-color` and brand tile. */
export const APP_MANIFEST_THEME_COLOR = '#0a0a0a';

export const APP_MANIFEST_DISPLAY = 'standalone';
export const APP_MANIFEST_ORIENTATION = 'portrait-primary';

/** Lucide {@link Boxes} brand mark — same icon as AuthLayout / FullPageSpinner. */
export const APP_ICON_PATHS = {
  svg: '/app-icon.svg',
  png192: '/pwa-192x192.png',
  png512: '/pwa-512x512.png',
} as const;

export interface WebManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

/** Canonical web app manifest object (written to `public/manifest.webmanifest`). */
export function buildWebManifest(): {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: typeof APP_MANIFEST_DISPLAY;
  orientation: typeof APP_MANIFEST_ORIENTATION;
  background_color: string;
  theme_color: string;
  categories: string[];
  dir: 'ltr';
  lang: string;
  icons: WebManifestIcon[];
  screenshots: [];
  shortcuts: Array<{
    name: string;
    short_name: string;
    url: string;
    description: string;
  }>;
} {
  return {
    name: APP_TITLE,
    short_name: APP_MANIFEST_SHORT_NAME,
    description: APP_MANIFEST_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: APP_MANIFEST_DISPLAY,
    orientation: APP_MANIFEST_ORIENTATION,
    background_color: APP_MANIFEST_BACKGROUND_COLOR,
    theme_color: APP_MANIFEST_THEME_COLOR,
    categories: ['business', 'productivity'],
    dir: 'ltr',
    lang: 'en-US',
    icons: [
      {
        src: APP_ICON_PATHS.png192,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: APP_ICON_PATHS.png512,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: APP_ICON_PATHS.png512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: APP_ICON_PATHS.svg,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Home',
        url: '/',
        description: 'Go to the main dashboard',
      },
    ],
  };
}
