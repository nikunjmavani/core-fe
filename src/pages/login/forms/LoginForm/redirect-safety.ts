/**
 * Same-origin path guard for the post-login redirect target.
 *
 * Rejects absolute URLs, protocol-relative paths (`//`), scheme smuggling
 * (`://`), and backslashes (browsers normalize `/\` to `//`, turning a
 * "path" into a protocol-relative URL). Lives outside LoginForm.tsx so the
 * component file only exports components (react-refresh) and the security
 * suite (tests/security/redirect-safety.security.test.ts) can import it
 * without pulling the form tree.
 */
export function isSafeRedirectPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('://') &&
    !path.includes('\\')
  );
}
