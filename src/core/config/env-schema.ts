/**
 * Env Zod schema and key list only. Safe to import from scripts that must not run
 * full client bootstrap (e.g. sync-env-example). Application code should use
 * {@link env.config.ts} + {@link platform-config.ts}.
 */
import { z } from 'zod';

import {
  enabledOAuthProviders,
  hasAnyAuthSurface,
  resolveBooleanFlag,
  resolveOAuthProviderFlags,
} from './env-resolvers.ts';

const booleanString = (defaultValue: 'true' | 'false') =>
  z
    .string()
    .optional()
    .default(defaultValue)
    .transform((value) => value === 'true' || value === '1');

/** Keys documented in `.env.example` and validated at tooling time. */
export const envSchemaBase = z.object({
  // --- Build-time (Vite / CI — not VITE_ prefixed) ---
  BUILD_I18N_MODE: z.enum(['single', 'multi']).optional().default('single'),
  BUILD_I18N_LOCALE: z.string().min(1).optional().default('en-US'),

  // --- Runtime public (VITE_* — bundled client) ---
  VITE_APP_VERSION: z.string().optional(),
  VITE_API_BASE_URL: z.string().optional(),
  VITE_DEV_API_URL: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: z.string().optional(),
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  VITE_LAYOUT_WIDTH: z.enum(['contained', 'full', 'reading']).optional(),
  VITE_THEME_LOCK: z.string().optional(),
  VITE_PRIVACY_POLICY_URL: z.string().optional(),
  VITE_CSP_REPORT_URI: z.string().optional(),
  VITE_DISABLED_MODULES: z.string().optional(),
  VITE_PERSONAL_ORGANIZATIONS: z.string().optional(),
  VITE_TEAM_ORGANIZATIONS: z.string().optional(),
  VITE_AUTH_EMAIL: booleanString('true'),
  VITE_AUTH_OAUTH_GOOGLE: booleanString('true'),
  VITE_AUTH_OAUTH_GITHUB: booleanString('true'),
  VITE_AUTH_OAUTH_APPLE: booleanString('false'),
  VITE_AUTH_OAUTH_AUTO_GOOGLE: booleanString('false'),
  VITE_AUTH_PASSKEY: booleanString('true'),
  VITE_CAPTCHA_DISABLED: z.string().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),

  // --- Platform diagnostics / dev tooling (VITE_* — bundled client) ---
  // Behavior is env-driven, never sniffed from the build mode: production
  // defaults are safe (logging/devtools/e2e off, version polling on); the
  // `.env.development` local file flips them on for dev.
  VITE_DEBUG_LOGGING: booleanString('false'),
  VITE_DEVTOOLS: booleanString('false'),
  VITE_E2E_HOOKS: booleanString('false'),
  VITE_VERSION_CHECK: booleanString('true'),

  // --- Runtime private (CI / build scripts only) ---
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  NETLIFY_AUTH_TOKEN: z.string().min(1).optional(),
  NETLIFY_SITE_ID: z.string().min(1).optional(),
  NODE_VERSION: z.string().min(1).optional(),
  CONTEXT7_API_KEY: z.string().min(1).optional(),

  // --- Local tooling only (never bundled / never set in CI) ---
  // SonarQube local quality gate — auto-managed in .env.development by tooling/sonar/sonar-gate.mjs.
  SONAR_ADMIN_PASSWORD: z.string().min(1).optional(),
  SONAR_TOKEN: z.string().min(1).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Build-INJECTED env — Vite `define` compile-time constants, NOT read from .env.
// Set by build plugins; deliberately absent from the schema above (and from
// .env.example's key list). Putting any of these in a .env file is a NO-OP — the
// `define` literal shadows the env value at build. Documented here for visibility:
//   VITE_APP_BUILD_ID         — build hash (plugins/version-json.ts) for new-deploy detection.
//   VITE_I18N_BUILD_MODE      — derived from BUILD_I18N_MODE  (plugins/i18n-build.ts): 'single' | 'multi'.
//   VITE_I18N_BUILD_BCP47     — derived from BUILD_I18N_LOCALE (plugins/i18n-build.ts).
//   VITE_I18N_BUILD_UI_LOCALE — derived from BUILD_I18N_LOCALE (plugins/i18n-build.ts).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One-line description per env key — the SINGLE source of truth. `.env.example`
 * (and therefore each scaffolded `.env.<environment>`) mirrors these verbatim as
 * the `# comment` directly above each key, and `pnpm tool:sync-env-example` FAILS
 * if any drift — so the wording a developer reads in this schema is exactly what
 * they see in their env file. Every `envSchemaBase` key must have an entry
 * (enforced in env-schema.test.ts).
 */
export const envFieldDescriptions: Readonly<Record<string, string>> = {
  BUILD_I18N_MODE:
    'i18n build mode: single (inline one locale into JS) or multi (lazy JSON per locale).',
  BUILD_I18N_LOCALE: 'Primary i18n build locale, BCP-47 (e.g. en-US).',
  VITE_APP_VERSION:
    'App version string; read by vite.config.ts (names the Sentry release, fallback 0.0.0) and the client. CI-set; blank locally.',
  VITE_API_BASE_URL:
    'Production API base URL (e.g. https://api.example.com); empty = same-origin. Required in production when the API is not same-origin.',
  VITE_DEV_API_URL: 'Dev server only: Vite proxy target for /api.',
  VITE_SENTRY_DSN: 'Sentry DSN (public client key); empty disables Sentry.',
  VITE_SENTRY_TRACES_SAMPLE_RATE:
    'Sentry traces sample rate 0..1 (prod-safe default 0.1).',
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE:
    'Sentry session-replay sample rate 0..1 (prod-safe default 0.1).',
  VITE_SENTRY_PROFILES_SAMPLE_RATE: 'Sentry profiles sample rate 0..1 (default 1.0).',
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE:
    'Sentry on-error replay sample rate 0..1 (default 1.0).',
  VITE_POSTHOG_KEY: 'PostHog project key (optional); analytics is gated behind consent.',
  VITE_POSTHOG_HOST: 'PostHog host (optional); pairs with VITE_POSTHOG_KEY.',
  VITE_STRIPE_PUBLISHABLE_KEY:
    'Stripe publishable key (pk_test_ in dev, pk_live_ in prod); public, safe to expose.',
  VITE_LAYOUT_WIDTH: 'App layout width: contained (default), full, or reading.',
  VITE_THEME_LOCK: '"true" hides the runtime theme switcher + shuffle.',
  VITE_PRIVACY_POLICY_URL:
    'Privacy-policy URL shown in the consent banner/footer (optional).',
  VITE_CSP_REPORT_URI: 'CSP violation report collector URI (optional).',
  VITE_DISABLED_MODULES:
    'Comma-separated module keys to disable (e.g. billing,members); routes 404 via the module gate.',
  VITE_PERSONAL_ORGANIZATIONS:
    'Tri-state override for personal-org deployment mode (true/false/unset).',
  VITE_TEAM_ORGANIZATIONS:
    'Tri-state override for team-org deployment mode (true/false/unset).',
  VITE_AUTH_EMAIL: 'Enable email/OTP auth on /login (default true).',
  VITE_AUTH_OAUTH_GOOGLE: 'Enable Google OAuth on /login (default true).',
  VITE_AUTH_OAUTH_GITHUB: 'Enable GitHub OAuth on /login (default true).',
  VITE_AUTH_OAUTH_APPLE: 'Enable Apple OAuth on /login (default false).',
  VITE_AUTH_OAUTH_AUTO_GOOGLE:
    'Auto-start Google OAuth on /login; requires VITE_AUTH_OAUTH_GOOGLE not false (default false).',
  VITE_AUTH_PASSKEY: 'Enable passkey/WebAuthn auth on /login (default true).',
  VITE_CAPTCHA_DISABLED:
    '"true" disables the Turnstile CAPTCHA (local dev; pair with the core-be test secret).',
  VITE_TURNSTILE_SITE_KEY:
    'Cloudflare Turnstile site key; required in production unless VITE_CAPTCHA_DISABLED is true.',
  VITE_DEBUG_LOGGING:
    '"true" emits [Module] diagnostic console logs (on locally, off in deployed builds).',
  VITE_DEVTOOLS:
    '"true" mounts React Query Devtools + the localhost debug panel + theme-shuffle shortcut.',
  VITE_E2E_HOOKS:
    '"true" installs Playwright E2E hooks on globalThis (navigateInApp, establishSession).',
  VITE_VERSION_CHECK:
    '"true" polls /version.json for new deployments (off locally/tests, on in deployed envs).',
  SENTRY_AUTH_TOKEN:
    'Sentry source-map upload token (CI only); see docs/integrations/sentry-sourcemaps.md.',
  SENTRY_ORG: 'Sentry organization slug (source-map upload).',
  SENTRY_PROJECT: 'Sentry project slug (source-map upload).',
  NETLIFY_AUTH_TOKEN: 'Netlify CLI deploy token (CI only).',
  NETLIFY_SITE_ID: 'Netlify site ID (deploy target).',
  NODE_VERSION: 'Node version for CI/build; keep in lock step with .nvmrc.',
  CONTEXT7_API_KEY:
    'Context7 docs-MCP API key; consumed by .mcp.json for the docs MCP (local tooling).',
  SONAR_ADMIN_PASSWORD:
    'Local SonarQube admin password; auto-managed by tooling/sonar/sonar-gate.mjs (never in CI).',
  SONAR_TOKEN:
    'Local SonarQube scanner token; auto-managed by the sonar gate (never in CI).',
};

/** Client `import.meta.env` subset validated at app boot. */
export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().optional(),
  VITE_DEV_API_URL: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: z.string().optional(),
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  VITE_LAYOUT_WIDTH: z.enum(['contained', 'full', 'reading']).optional(),
  VITE_THEME_LOCK: z.string().optional(),
  VITE_PRIVACY_POLICY_URL: z.string().optional(),
  VITE_CSP_REPORT_URI: z.string().optional(),
  VITE_DISABLED_MODULES: z.string().optional(),
  VITE_PERSONAL_ORGANIZATIONS: z.string().optional(),
  VITE_TEAM_ORGANIZATIONS: z.string().optional(),
  VITE_AUTH_EMAIL: z.string().optional(),
  VITE_AUTH_OAUTH_GOOGLE: z.string().optional(),
  VITE_AUTH_OAUTH_GITHUB: z.string().optional(),
  VITE_AUTH_OAUTH_APPLE: z.string().optional(),
  VITE_AUTH_OAUTH_AUTO_GOOGLE: z.string().optional(),
  VITE_AUTH_PASSKEY: z.string().optional(),
  VITE_CAPTCHA_DISABLED: z.string().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  VITE_DEBUG_LOGGING: z.string().optional(),
  VITE_DEVTOOLS: z.string().optional(),
  VITE_E2E_HOOKS: z.string().optional(),
  VITE_VERSION_CHECK: z.string().optional(),
  // Runtime mode: `local | development | production | test` (no 'staging'). `local` is a
  // developer's machine — mirrors core-be's `NODE_ENV=local` so both repos share one env
  // vocabulary; `development` / `production` are the two DEPLOY targets (DeployEnvironment),
  // and you never deploy to `local`. `test` is kept solely because it is the Vitest runner's
  // Vite mode (not a deploy environment). The default stays `development` (Vite's dev-server
  // convention), so a stock `pnpm dev` is unchanged; `local` is opt-in via `vite --mode local`.
  // Reported name only, never branched on — the raw `DEV`/`PROD` booleans are intentionally
  // absent (behavior is driven by named flags). An out-of-enum value fails loudly at load
  // (env.config.ts throws).
  MODE: z.enum(['local', 'development', 'production', 'test']).default('development'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** Cross-field invariants for auth platform switches. */
export function assertAuthPlatformInvariants(
  get: (key: string) => string | undefined,
): void {
  const oauthAutoGoogle = get('AUTH_OAUTH_AUTO_GOOGLE') === 'true';
  const oauthGoogleOff = get('AUTH_OAUTH_GOOGLE') === 'false';
  if (oauthAutoGoogle && oauthGoogleOff) {
    throw new Error(
      '[Config] VITE_AUTH_OAUTH_AUTO_GOOGLE=true requires VITE_AUTH_OAUTH_GOOGLE not false.',
    );
  }

  // The production Turnstile requirement is enforced at deploy time by
  // `validate:client-env` (envProfiles.production.required) — not a runtime
  // isProduction branch.

  const email = get('AUTH_EMAIL') !== 'false';
  const passkey = get('AUTH_PASSKEY') !== 'false';
  const oauth = resolveOAuthProviderFlags(get);
  if (!hasAnyAuthSurface({ email, passkey, oauth })) {
    if (resolveBooleanFlag(get('DEBUG_LOGGING'), false)) {
      console.warn(
        '[Config] No auth methods enabled (email, oauth providers, passkey). /login will show an empty state.',
      );
    }
  }
}

/** Ordered list of env var names from the schema (for .env.example sync). */
export const envSchemaKeys = Object.keys(envSchemaBase.shape) as (keyof z.infer<
  typeof envSchemaBase
>)[];

/** Keys with no default and not optional — must be set in deploy environments. */
export const envSchemaRequiredKeys: readonly string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Per-environment (branch-wise) env contracts
// ─────────────────────────────────────────────────────────────────────────────

/** Deploy environments — one per deploying branch (see .github/environments). */
export type DeployEnvironment = 'development' | 'production';

/**
 * Branch → deploy environment. Mirrors `.github/environments/README.md`:
 *   `dev`  → `development` (`.env.development`)
 *   `main` → `production`  (`.env.production`)
 *
 * Branches not listed here (feature branches) map to no environment and are
 * skipped by the branch-wise validator.
 */
export const branchEnvironmentMap: Readonly<Record<string, DeployEnvironment>> = {
  dev: 'development',
  main: 'production',
};

/** Resolve the deploy environment for a git branch, or `undefined` if unmapped. */
export function environmentForBranch(
  branch: string | undefined,
): DeployEnvironment | undefined {
  if (!branch) return undefined;
  return branchEnvironmentMap[branch];
}

type EnvGet = (key: string) => string | undefined;

/** A key that must be set for an environment (optionally only under a condition). */
export interface RequiredKeyRule {
  readonly key: string;
  /** Required only when this predicate is true. Omit = always required. */
  readonly when?: (get: EnvGet) => boolean;
  /** Human-readable condition, surfaced in messages and `.env.example`. */
  readonly condition?: string;
  /** `error` fails the gate; `warn` only reports. Defaults to `error`. */
  readonly level?: 'error' | 'warn';
}

/** A key that must NOT reach an environment (optionally only when value matches). */
export interface ForbiddenKeyRule {
  readonly key: string;
  /** Forbidden only when the value matches. Omit = key must be unset entirely. */
  readonly valuePattern?: RegExp;
  /** Why it is forbidden — shown in the validator error. */
  readonly reason: string;
}

/** Per-environment env contract enforced by `pnpm validate:client-env`. */
export interface EnvProfile {
  readonly required: readonly RequiredKeyRule[];
  readonly forbidden: readonly ForbiddenKeyRule[];
  /**
   * Strict allowed-value sets per key for this environment. If a key listed here
   * has a configured value outside its set, `validate:client-env` FAILS. This is
   * the per-environment "allowed values" contract — e.g. production allows only
   * the safe value for each diagnostics flag. Omitted key = any value allowed
   * (Zod still enforces enums/types at the schema layer).
   */
  readonly allowed?: Readonly<Record<string, readonly string[]>>;
}

/** Boolean flags whose allowed value differs by environment (dev: either; prod: safe). */
const BOOL = ['true', 'false'] as const;

/** Local-only tooling secrets that must never land in any committed deploy env. */
const SONAR_LOCAL_ONLY: readonly ForbiddenKeyRule[] = [
  {
    key: 'SONAR_TOKEN',
    reason: 'local-only SonarQube secret — never set in a committed/deploy env',
  },
  {
    key: 'SONAR_ADMIN_PASSWORD',
    reason: 'local-only SonarQube secret — never set in a committed/deploy env',
  },
];

/**
 * Branch-wise env contracts. `required` is checked against the resolved runtime
 * env; `forbidden` is checked against git-TRACKED `.env` + `.env.<env>` files only
 * (gitignored local files are skipped), so local secrets in the gitignored
 * `.env.development` never trip a deploy guard.
 */
export const envProfiles: Readonly<Record<DeployEnvironment, EnvProfile>> = {
  development: {
    required: [],
    forbidden: [
      ...SONAR_LOCAL_ONLY,
      {
        key: 'VITE_STRIPE_PUBLISHABLE_KEY',
        valuePattern: /^pk_live_/,
        reason: 'live Stripe key must not be used in development — use a pk_test_… key',
      },
    ],
    // Development may toggle diagnostics either way (typos still rejected).
    allowed: {
      VITE_DEBUG_LOGGING: BOOL,
      VITE_DEVTOOLS: BOOL,
      VITE_E2E_HOOKS: BOOL,
      VITE_VERSION_CHECK: BOOL,
    },
  },
  production: {
    required: [
      {
        key: 'VITE_TURNSTILE_SITE_KEY',
        when: (get) => get('VITE_CAPTCHA_DISABLED') !== 'true',
        condition: 'production build with VITE_CAPTCHA_DISABLED not true',
        level: 'error',
      },
      {
        key: 'VITE_API_BASE_URL',
        condition: 'production deploy when API is not same-origin',
        level: 'warn',
      },
    ],
    forbidden: [
      ...SONAR_LOCAL_ONLY,
      {
        key: 'VITE_STRIPE_PUBLISHABLE_KEY',
        valuePattern: /^pk_test_/,
        reason: 'test Stripe key must not ship to production — use a pk_live_… key',
      },
    ],
    // Production is strict: diagnostics/devtools/e2e off, version polling on.
    allowed: {
      VITE_DEBUG_LOGGING: ['false'],
      VITE_DEVTOOLS: ['false'],
      VITE_E2E_HOOKS: ['false'],
      VITE_VERSION_CHECK: ['true'],
    },
  },
};

/**
 * Conditionally required keys surfaced in deploy validators — derived from the
 * production profile so the two never drift.
 */
export const envSchemaConditionallyRequiredKeys: ReadonlyArray<{
  readonly key: string;
  readonly condition: string;
}> = envProfiles.production.required
  .filter(
    (rule): rule is RequiredKeyRule & { condition: string } =>
      typeof rule.condition === 'string',
  )
  .map(({ key, condition }) => ({ key, condition }));

/** @internal Test helper — validate oauth provider list from flags. */
export function __testEnabledOAuthFromGet(get: (key: string) => string | undefined) {
  return enabledOAuthProviders(resolveOAuthProviderFlags(get));
}
