import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/shared/components/ui/button.tsx';
import {
  type AuthContinuePending,
  authMethodIsDisabled,
  authMethodIsLoading,
} from '@/shared/forms/AuthForm/auth-form-pending.ts';

type ButtonVariant = ComponentProps<typeof Button>['variant'];

type AuthMethodButtonProps = {
  /** Which continue action this button represents (OAuth provider, passkey, email step). */
  target: AuthContinuePending;
  /** The single continue action currently in flight across the whole form (or `null`). */
  pending: AuthContinuePending | null;
  /** Stable label — never swapped while loading; the spinner conveys progress. */
  label: ReactNode;
  /** Leading icon; hidden while the spinner shows so there is never a double icon. */
  icon?: ReactNode;
  /** Required for E2E + a11y selectors. */
  testId: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  className?: string;
  /**
   * Whether this method needs a Turnstile captcha token. When `true`, the button
   * is disabled until the token mints and shows the captcha-init spinner — but
   * only while nothing else is pending, so consuming the single-use token on one
   * method never spins the others.
   */
  captchaGated?: boolean;
  /** Live captcha readiness — only consulted when `captchaGated`. */
  turnstileReady?: boolean;
  /** Method-specific disable conditions (e.g. invalid form, cooldown, code length). */
  extraDisabled?: boolean;
};

/**
 * The single source of truth for how an auth method button behaves while the
 * form has an action in flight. Every method (OAuth, passkey, email send/verify)
 * renders through this so they stay identical:
 *
 * - **Stable label** — the text never changes; the spinner is the only progress cue.
 * - **One spinner at a time** — only the clicked method spins; the rest are
 *   disabled without a spinner.
 * - **Captcha-init affordance** — captcha-gated methods spin while the first
 *   token mints, but only when nothing else is pending.
 *
 * See `docs/reference/unified-auth-flows.md` → "Method button states".
 */
export function AuthMethodButton({
  target,
  pending,
  label,
  icon,
  testId,
  onClick,
  type = 'button',
  variant = 'outline',
  className = 'w-full',
  captchaGated = false,
  turnstileReady = true,
  extraDisabled = false,
}: AuthMethodButtonProps) {
  const loading = authMethodIsLoading(pending, target);
  const nothingElsePending = pending === null;
  const captchaBlocking = captchaGated && !turnstileReady;
  // Spin for THIS method, or the captcha-init state — but never for an idle
  // method once another is pending (single-use token would otherwise flip all).
  const spinning = loading || (captchaBlocking && nothingElsePending);
  const disabled =
    extraDisabled || captchaBlocking || authMethodIsDisabled(pending, target);

  return (
    <Button
      type={type}
      variant={variant}
      className={className}
      disabled={disabled}
      isLoading={spinning}
      onClick={onClick}
      data-testid={testId}
    >
      {spinning ? null : icon}
      {label}
    </Button>
  );
}
