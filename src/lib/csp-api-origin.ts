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

/**
 * Third-party origins the app must reach (observability + analytics). Kept in
 * lock step with the connect-src list in index.html's meta CSP — the static
 * security test asserts they agree.
 */
const CONNECT_SRC_THIRD_PARTY = [
  'https://*.ingest.sentry.io',
  'https://*.sentry.io',
  'https://us.i.posthog.com',
  'https://us-assets.i.posthog.com',
] as const;

/**
 * The canonical Content-Security-Policy as a single-line header value.
 *
 * This is the authoritative, header-delivered policy (index.html's meta CSP is
 * a parse-time fallback). Header delivery applies before the document parses
 * and — unlike a meta tag — can carry reporting directives. `frame-ancestors`
 * is included here because it only works as a header.
 *
 * @param apiBaseUrl - VITE_API_BASE_URL; its origin is added to connect-src.
 * @param reportUri - optional CSP violation collector; adds report-uri + report-to.
 */
export function buildContentSecurityPolicy(
  apiBaseUrl: string | undefined,
  reportUri?: string,
): string {
  const apiOrigin = getCspConnectSrcOrigin(apiBaseUrl);
  const connectSrc = [
    "'self'",
    ...(apiOrigin ? [apiOrigin] : []),
    ...CONNECT_SRC_THIRD_PARTY,
  ];

  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc.join(' ')}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`, 'report-to csp');
  }

  return directives.join('; ');
}
