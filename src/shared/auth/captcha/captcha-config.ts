import { platformConfig } from '@/core/config/env.ts';

export type CaptchaProvider = 'disabled' | 'dev' | 'turnstile';

/**
 * Whether auth continue actions must pass a captcha gate before proceeding.
 * Disabled in Vitest (`MODE=test`) and when `VITE_CAPTCHA_DISABLED=true`.
 */
export function isCaptchaEnabled(): boolean {
  if (platformConfig.environment === 'test') return false;
  if (platformConfig.captchaDisabled) return false;
  return true;
}

/** Which captcha surface to render inside the auth dialog. */
export function resolveCaptchaProvider(): CaptchaProvider {
  if (!isCaptchaEnabled()) return 'disabled';
  if (platformConfig.turnstileSiteKey) return 'turnstile';
  return 'dev';
}

/** Whether public auth must wait for a background Turnstile token before POST. */
export function isTurnstileCaptchaGateActive(): boolean {
  return (
    isCaptchaEnabled() &&
    resolveCaptchaProvider() === 'turnstile' &&
    Boolean(platformConfig.turnstileSiteKey)
  );
}
