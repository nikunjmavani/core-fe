/**
 * Env Zod schema and key list only. Safe to import from scripts that must not run
 * full client bootstrap (e.g. sync-env-example). Application code should use
 * {@link env.config.ts} + {@link platform-config.ts}.
 */
import { z } from 'zod';

import {
  enabledOAuthProviders,
  hasAnyAuthSurface,
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
  VITE_API_BASE_URL: z.string().optional(),
  VITE_DEV_API_URL: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
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
  VITE_AUTH_EMAIL_PASSWORD: booleanString('true'),
  VITE_AUTH_EMAIL: booleanString('true'),
  VITE_AUTH_OAUTH_GOOGLE: booleanString('true'),
  VITE_AUTH_OAUTH_GITHUB: booleanString('true'),
  VITE_AUTH_OAUTH_APPLE: booleanString('false'),
  VITE_AUTH_OAUTH_AUTO_GOOGLE: booleanString('false'),
  VITE_AUTH_PASSKEY: booleanString('true'),
  VITE_CAPTCHA_DISABLED: z.string().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),

  // --- Runtime private (CI / build scripts only) ---
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  NETLIFY_AUTH_TOKEN: z.string().min(1).optional(),
  NETLIFY_SITE_ID: z.string().min(1).optional(),
  NODE_VERSION: z.string().min(1).optional(),
  CONTEXT7_API_KEY: z.string().min(1).optional(),

  // --- Local tooling only (never bundled / never set in CI) ---
  // SonarQube local quality gate — auto-managed in .env.local by tooling/sonar/sonar-gate.mjs.
  SONAR_ADMIN_PASSWORD: z.string().min(1).optional(),
  SONAR_TOKEN: z.string().min(1).optional(),
});

/** Client `import.meta.env` subset validated at app boot. */
export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().optional(),
  VITE_DEV_API_URL: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
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
  VITE_AUTH_EMAIL_PASSWORD: z.string().optional(),
  VITE_AUTH_EMAIL: z.string().optional(),
  VITE_AUTH_OAUTH_GOOGLE: z.string().optional(),
  VITE_AUTH_OAUTH_GITHUB: z.string().optional(),
  VITE_AUTH_OAUTH_APPLE: z.string().optional(),
  VITE_AUTH_OAUTH_AUTO_GOOGLE: z.string().optional(),
  VITE_AUTH_PASSKEY: z.string().optional(),
  VITE_CAPTCHA_DISABLED: z.string().optional(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  MODE: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** Cross-field invariants for auth platform switches. */
export function assertAuthPlatformInvariants(
  get: (key: string) => string | undefined,
  isProduction: boolean,
): void {
  const oauthAutoGoogle = get('AUTH_OAUTH_AUTO_GOOGLE') === 'true';
  const oauthGoogleOff = get('AUTH_OAUTH_GOOGLE') === 'false';
  if (oauthAutoGoogle && oauthGoogleOff) {
    throw new Error(
      '[Config] VITE_AUTH_OAUTH_AUTO_GOOGLE=true requires VITE_AUTH_OAUTH_GOOGLE not false.',
    );
  }

  const captchaDisabled = get('CAPTCHA_DISABLED') === 'true';
  if (isProduction && !captchaDisabled && !get('TURNSTILE_SITE_KEY')) {
    throw new Error(
      '[Config] VITE_TURNSTILE_SITE_KEY is required in production when VITE_CAPTCHA_DISABLED is not true.',
    );
  }

  const email = get('AUTH_EMAIL') !== 'false';
  const passkey = get('AUTH_PASSKEY') !== 'false';
  const oauth = resolveOAuthProviderFlags(get);
  if (!hasAnyAuthSurface({ email, passkey, oauth })) {
    if (import.meta.env.DEV) {
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
}

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
 * env; `forbidden` is checked against the committed `.env` + `.env.<env>` layer
 * (never `.env.local`), so local secrets never trip a deploy guard.
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
