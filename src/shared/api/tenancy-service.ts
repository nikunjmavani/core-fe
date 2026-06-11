import { TENANT } from '@/core/config/constants.ts';
import { useTenantStore } from '@/shared/store/useTenantStore/index.ts';

/**
 * Resolve tenant from the subdomain of the current URL.
 *
 * Expected format: `{tenant-slug}.app.example.com`
 * Localhost / bare domains: Falls back to a configurable default tenant.
 *
 * This function is SYNCHRONOUS — no API call needed for initial resolution.
 * The resolved tenant is stored in the Zustand store, which the Axios
 * interceptor reads from on every request.
 */
export function resolveTenantFromSubdomain(): void {
  const hostname = window.location.hostname;

  // Localhost / IP — use fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    useTenantStore
      .getState()
      .setTenant(TENANT.LOCALHOST_FALLBACK, TENANT.LOCALHOST_FALLBACK);
    return;
  }

  // Extract subdomain: "acme.app.example.com" → "acme"
  const parts = hostname.split('.');
  if (parts.length < 3) {
    // No subdomain detected (e.g., "app.example.com") — use fallback
    // to ensure X-Tenant-ID header is always present
    if (import.meta.env.DEV) {
      console.warn(
        '[Tenancy] No subdomain detected in hostname:',
        hostname,
        '— using fallback',
      );
    }
    useTenantStore
      .getState()
      .setTenant(TENANT.LOCALHOST_FALLBACK, TENANT.LOCALHOST_FALLBACK);
    return;
  }

  const slug = parts[0]!;

  // Validate slug format to prevent header injection (bounded character class, no ReDoS risk)
  // eslint-disable-next-line security/detect-unsafe-regex -- [a-z0-9-]{0,61} is bounded, not user-controlled pattern
  const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!SLUG_RE.test(slug)) {
    if (import.meta.env.DEV) {
      console.warn('[Tenancy] Invalid subdomain slug:', slug, '— using fallback');
    }
    useTenantStore
      .getState()
      .setTenant(TENANT.LOCALHOST_FALLBACK, TENANT.LOCALHOST_FALLBACK);
    return;
  }

  // Use slug as both ID and slug initially; backend validation can enrich later
  useTenantStore.getState().setTenant(slug, slug);
}

/**
 * Get the current tenant slug (convenience helper).
 */
export function getCurrentTenantSlug(): string | null {
  return useTenantStore.getState().tenantSlug;
}
