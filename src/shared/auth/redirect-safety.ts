/**
 * Same-origin path guard for post-auth redirects (the `?redirect=` / `returnTo`
 * target). Shared by every auth flow (login, MFA, …) — pages can't import from
 * each other, so this lives in `shared/auth`. The security suite
 * (tests/security/redirect-safety.security.test.ts) imports it directly.
 *
 * Rejects absolute URLs, protocol-relative paths (`//`), scheme smuggling
 * (`://`), backslashes (browsers normalize `/\` to `//`), and embedded control
 * characters / whitespace (browsers strip these, so `/<TAB>/evil.com` can
 * collapse into a protocol-relative open redirect).
 */

/** True if any char is a C0 control / space (≤ 0x20) or DEL (0x7F). */
function hasControlOrWhitespace(path: string): boolean {
  for (let i = 0; i < path.length; i += 1) {
    const code = path.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function isSafeRedirectPath(path: string): boolean {
  if (hasControlOrWhitespace(path)) return false;
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('://') &&
    !path.includes('\\')
  );
}

/** Narrow an unknown value to a safe same-origin redirect path, else `undefined`. */
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === 'string' && isSafeRedirectPath(value) ? value : undefined;
}
