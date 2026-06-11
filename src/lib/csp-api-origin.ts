/**
 * Derive a CSP connect-src origin from VITE_API_BASE_URL.
 * Returns null for empty, invalid, or same-origin-relative URLs.
 */
export function getCspConnectSrcOrigin(apiBaseUrl: string | undefined): string | null {
  const trimmed = apiBaseUrl?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/** CSP connect-src fragment to inject after 'self' (leading newline + spaces optional). */
export function formatCspApiConnectSrcFragment(apiBaseUrl: string | undefined): string {
  const origin = getCspConnectSrcOrigin(apiBaseUrl);
  if (!origin) return '';
  return `\n               ${origin}`;
}
