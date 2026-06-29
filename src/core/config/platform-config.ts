import type { I18nBuildMode } from '@/lib/i18n/build-config.ts';
import { buildEnv } from '@/lib/i18n/build-env.ts';

import type { OAuthProviderFlags } from './env-resolvers.ts';
import {
  resolveAuthMethodFlag,
  resolveDeploymentOverride,
  resolveDisabledModules,
  resolveLayoutWidthForced,
  resolveOAuthProviderFlags,
  resolveThemeLock,
} from './env-resolvers.ts';

/** Which auth methods this deployment exposes on the unified auth screen. */
export interface AuthMethods {
  emailPassword: boolean;
  email: boolean;
  oauth: OAuthProviderFlags;
  passkey: boolean;
  /** When true with Google OAuth on, `/login` auto-starts Google OAuth in the background. */
  oauthAutoGoogle: boolean;
}

/** Optional env overrides for deployment org kinds (null = defer to me/context). */
export interface DeploymentEnvOverrides {
  personalOrganizations: boolean | null;
  teamOrganizations: boolean | null;
}

export interface PlatformConfig {
  apiBaseUrl: string;
  sentryDsn: string | undefined;
  posthogKey: string | undefined;
  posthogHost: string | undefined;
  privacyPolicyUrl: string | undefined;
  layoutWidthForced: ReturnType<typeof resolveLayoutWidthForced>;
  themeLock: boolean;
  disabledModules: ReadonlySet<string>;
  authMethods: AuthMethods;
  captchaDisabled: boolean;
  turnstileSiteKey: string | undefined;
  stripePublishableKey: string | undefined;
  deploymentOverrides: DeploymentEnvOverrides;
  buildI18nMode: I18nBuildMode;
  buildI18nLocale: string;
  appBuildId: string | undefined;
  appVersion: string | undefined;
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export type ConfigGet = (key: string) => string | undefined;

type ClientEnvSlice = {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
};

/** Build typed platform config from resolved env getters. */
export function resolvePlatformConfig(
  get: ConfigGet,
  clientEnv: ClientEnvSlice,
): PlatformConfig {
  const oauth = resolveOAuthProviderFlags(get);
  const oauthAutoGoogleRaw = resolveAuthMethodFlag(get('AUTH_OAUTH_AUTO_GOOGLE'), false);

  return {
    apiBaseUrl: clientEnv.MODE === 'development' ? '' : (get('API_BASE_URL') ?? ''),

    sentryDsn: get('SENTRY_DSN'),
    posthogKey: get('POSTHOG_KEY'),
    posthogHost: get('POSTHOG_HOST'),
    privacyPolicyUrl: get('PRIVACY_POLICY_URL'),
    layoutWidthForced: resolveLayoutWidthForced(get('LAYOUT_WIDTH')),
    themeLock: resolveThemeLock(get('THEME_LOCK')),
    disabledModules: resolveDisabledModules(get('DISABLED_MODULES')),

    authMethods: {
      emailPassword: resolveAuthMethodFlag(get('AUTH_EMAIL_PASSWORD'), true),
      email: resolveAuthMethodFlag(get('AUTH_EMAIL'), true),
      oauth,
      passkey: resolveAuthMethodFlag(get('AUTH_PASSKEY'), true),
      oauthAutoGoogle: oauthAutoGoogleRaw && oauth.google,
    },

    captchaDisabled: get('CAPTCHA_DISABLED') === 'true',
    turnstileSiteKey: get('TURNSTILE_SITE_KEY'),
    stripePublishableKey: get('STRIPE_PUBLISHABLE_KEY'),

    deploymentOverrides: {
      personalOrganizations: resolveDeploymentOverride(get('PERSONAL_ORGANIZATIONS')),
      teamOrganizations: resolveDeploymentOverride(get('TEAM_ORGANIZATIONS')),
    },

    buildI18nMode: buildEnv.i18nMode,
    buildI18nLocale: buildEnv.i18nBcp47,
    appBuildId: buildEnv.appBuildId,
    appVersion: buildEnv.appVersion,

    environment: clientEnv.MODE,
    isDevelopment: clientEnv.DEV,
    isProduction: clientEnv.PROD,
  };
}

/** Resolved auth-method toggles for `/login`. */
export function resolveAuthMethodsFromPlatform(platform: PlatformConfig): AuthMethods {
  return platform.authMethods;
}

/** Whether a feature module is enabled for this deployment. */
export function isPlatformModuleEnabled(
  platform: PlatformConfig,
  moduleKey: string,
): boolean {
  return !platform.disabledModules.has(moduleKey);
}
