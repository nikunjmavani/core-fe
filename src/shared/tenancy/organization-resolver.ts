import { organizationDashboard, organizationPicker } from '@/lib/routes/index.ts';
import { getLastOrganizationFromStorage } from '@/shared/store/useOrganizationStore/index.ts';

import { listMyOrganizations } from './my-organizations.ts';

type RootRedirect =
  | ReturnType<typeof organizationDashboard>
  | ReturnType<typeof organizationPicker>
  | { readonly to: '/onboarding' };

/**
 * `/` resolver (docs/reference/routing-and-tenancy.md §2): the root URL keeps
 * no UI — it redirects to the last-used organization's dashboard, else the
 * `/organization` picker, else `/onboarding` when the user has no
 * organizations yet. The last-used organization is validated against current
 * memberships so a stale storage entry can't redirect into a 404.
 */
export async function resolveRootRedirect(): Promise<RootRedirect> {
  const organizations = await listMyOrganizations();
  if (organizations.length === 0) return { to: '/onboarding' } as const;

  const last = getLastOrganizationFromStorage();
  const lastIsValid = last && organizations.some((o) => o.id === last.id);
  if (lastIsValid) return organizationDashboard(last.id);

  return organizationPicker();
}
