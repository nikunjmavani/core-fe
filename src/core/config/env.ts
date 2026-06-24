import { z } from 'zod';

/**
 * Runtime environment configuration validated with Zod.
 *
 * Env files at project root:
 *   .env                 → shared defaults
 *   .env.development     → dev overrides
 *   .env.production      → production overrides
 *   .env.local           → local secrets (gitignored)
 *
 * In development: API calls are proxied through Vite so apiBaseUrl is empty.
 * In production: VITE_API_BASE_URL must be set or apiBaseUrl defaults to ''
 *                (relative to origin), which is valid for same-origin deploys.
 *
 * Also reads from window.__CONFIG__ for optional runtime config injection (e.g. from host).
 */

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().optional(),
  VITE_DEV_API_URL: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional(),
  VITE_USE_MOCK_API: z.string().optional(),
  VITE_LAYOUT_WIDTH: z.enum(['contained', 'full']).optional(),
  VITE_THEME_LOCK: z.string().optional(),
  MODE: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const detail = JSON.stringify(z.flattenError(parsed.error));
  if (import.meta.env.PROD) {
    throw new Error(`[Config] Invalid environment configuration: ${detail}`);
  }
  console.warn('[Config] Invalid env (dev continues):', detail);
}

const env = parsed.success ? parsed.data : envSchema.parse({});

// Optional runtime config (window.__CONFIG__)
const runtimeConfig: Record<string, string> =
  (typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).__CONFIG__ as
        | Record<string, string>
        | undefined)
    : undefined) ?? {};

/** Read a config value: runtime (window.__CONFIG__) takes precedence over build-time (Vite) */
function get(key: string): string | undefined {
  /* eslint-disable security/detect-object-injection -- keys from controlled get() calls, not user input */
  const value =
    runtimeConfig[key] ??
    (import.meta.env[`VITE_${key}`] as string | undefined) ??
    undefined;
  /* eslint-enable security/detect-object-injection */
  return value;
}

type AppMode = z.infer<typeof envSchema>['MODE'];

/**
 * Whether the mock API layer is active. Never enabled in production, staging, or test.
 * @internal Exported for unit tests.
 */
export function resolveUseMockApi(options: {
  mode: AppMode;
  isProd: boolean;
  useMockApiFlag: string | undefined;
}): boolean {
  if (options.mode === 'test') return false;

  const isDeployed =
    options.isProd || options.mode === 'production' || options.mode === 'staging';
  if (isDeployed) {
    if (options.useMockApiFlag === 'true') {
      throw new Error(
        '[Config] VITE_USE_MOCK_API=true is not allowed in production or staging builds. Remove it or set VITE_USE_MOCK_API=false.',
      );
    }
    return false;
  }

  return options.useMockApiFlag !== 'false';
}

/**
 * App content layout width: `contained` centers content in a max-width 12-grid
 * (default); `full` is edge-to-edge. @internal Exported for unit tests.
 */
export function resolveLayoutWidth(flag: string | undefined): 'contained' | 'full' {
  return flag === 'full' ? 'full' : 'contained';
}

/**
 * When true, the app is locked to the code-defined theme — the runtime theme
 * switcher + shuffle are hidden. @internal Exported for unit tests.
 */
export function resolveThemeLock(flag: string | undefined): boolean {
  return flag === 'true';
}

/**
 * Feature modules disabled for this deployment (`VITE_DISABLED_MODULES`, a
 * comma-separated list of module keys). A disabled module's routes 404 and its
 * nav/settings entries are hidden (FE-50). Empty by default — all enabled.
 * @internal Exported for unit tests.
 */
export function resolveDisabledModules(flag: string | undefined): ReadonlySet<string> {
  return new Set(
    (flag ?? '')
      .split(',')
      .map((module) => module.trim())
      .filter(Boolean),
  );
}

export const config = {
  /** Base URL for API calls. Empty in dev (Vite proxy). Set in production. */
  apiBaseUrl:
    env.MODE === 'development'
      ? '' // Vite proxy handles it in dev
      : (get('API_BASE_URL') ?? ''),

  sentryDsn: get('SENTRY_DSN'),
  posthogKey: get('POSTHOG_KEY'),
  posthogHost: get('POSTHOG_HOST'),

  /**
   * When true, the app serves data from the tagged mock layer instead of a live
   * backend (search `REPLACE_WITH_API`). Enabled in development only (defaults on).
   * Always false in production/staging/test. Set `VITE_USE_MOCK_API=false` when using a local API.
   */
  useMockApi: resolveUseMockApi({
    mode: env.MODE,
    isProd: env.PROD,
    useMockApiFlag: get('USE_MOCK_API'),
  }),

  /**
   * Content layout width: `contained` (centered 12-grid, default) or `full`
   * (edge-to-edge). Set `VITE_LAYOUT_WIDTH=full` to opt in.
   */
  layoutWidth: resolveLayoutWidth(get('LAYOUT_WIDTH')),

  /**
   * When true (`VITE_THEME_LOCK=true`), freeze the app to the code-defined theme
   * — the runtime theme switcher + shuffle are hidden. Default: customizable.
   */
  themeLock: resolveThemeLock(get('THEME_LOCK')),

  /**
   * Feature modules disabled for this deployment (comma-separated
   * `VITE_DISABLED_MODULES`). Empty by default — everything enabled. A disabled
   * module's routes 404 (L6b gate) and its nav/settings entries hide.
   */
  disabledModules: resolveDisabledModules(get('DISABLED_MODULES')),

  environment: env.MODE,
  isDevelopment: env.DEV,
  isProduction: env.PROD,
} as const;

// Warn in production if critical env vars are missing
if (config.isProduction && !get('API_BASE_URL')) {
  console.warn(
    '[Config] VITE_API_BASE_URL is not set in production — API calls will be relative to origin.',
  );
}

// Reject insecure API base URLs in production (HTTP instead of HTTPS)
if (
  config.isProduction &&
  config.apiBaseUrl?.startsWith('http://') &&
  !config.apiBaseUrl.startsWith('http://localhost')
) {
  throw new Error(
    '[Config] VITE_API_BASE_URL must use HTTPS in production. Received: ' +
      config.apiBaseUrl.slice(0, 40),
  );
}
