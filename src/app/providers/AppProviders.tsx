import type { ReactNode } from 'react';

import { QueryProvider } from './QueryProvider.tsx';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Compose all application providers in the correct order.
 *
 * SEO/meta tags are handled by TanStack Router (HeadContent + route head() in routeTree).
 * Tenant resolution is performed synchronously in main.tsx BEFORE React mounts.
 * Components consume tenant state via `useTenantStore()` directly.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
