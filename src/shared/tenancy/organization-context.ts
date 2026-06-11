import {
  persistOrganizationToStorage,
  useOrganizationStore,
} from '@/shared/store/useOrganizationStore/index.ts';

/**
 * Organization context — **the URL is the single source of truth.**
 *
 * Inside `/organization/$organizationId/*` the route param is canonical; the
 * Zustand store is a derived cache synced FROM the route (never the other way
 * around), kept only so non-React code — the HTTP client's organization
 * header, RBAC helpers — can read the active organization synchronously.
 * localStorage / subdomain resolution are used solely by the `/` resolver to
 * pick a redirect target. Multi-tab correctness follows: each tab's URL
 * carries its own organization. (docs/reference/routing-and-tenancy.md §4)
 */
export function syncOrganizationFromRoute(organizationId: string, slug: string): void {
  const store = useOrganizationStore.getState();
  if (store.organizationId !== organizationId) {
    store.setOrganization(organizationId, slug);
  }
  persistOrganizationToStorage(organizationId, slug);
}

/** Active organization id (derived cache — canonical value lives in the URL). */
export function getActiveOrganizationId(): string | null {
  return useOrganizationStore.getState().organizationId;
}
