/**
 * Same-origin path guard for the post-login redirect target.
 *
 * Rejects absolute URLs, protocol-relative paths (`//`), scheme smuggling
 * (`://`), backslashes (browsers normalize `/\` to `//`), and embedded control
 * characters / whitespace (browsers strip these, so `/<TAB>/evil.com` can
 * collapse into a protocol-relative open redirect). Lives outside LoginForm.tsx
 * so the component file only exports components (react-refresh) and the security
 * suite (tests/security/redirect-safety.security.test.ts) can import it without
 * pulling the form tree.
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
