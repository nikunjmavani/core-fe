import { useRouterState } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import {
  isAuthenticatedAppSurface,
  useAuthenticatedIdleChunkPrefetch,
} from '@/lib/chunk-prefetch.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

const AppearanceDialogInner = lazy(() =>
  import('./AppearanceDialog.tsx').then((m) => ({ default: m.AppearanceDialog })),
);

/**
 * Lazy shell for the Appearance dialog — keeps the theme-studio chunk (every
 * picker + the colour maths) out of the entry preload graph. Mounts the dialog
 * only once opened; prefetched at idle on authenticated app routes.
 */
export function AppearanceDialogLazy() {
  const open = useUIStore((s) => s.appearanceOpen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const prefetchEnabled =
    !open && isAuthenticatedAppSurface(pathname, isAuthenticated, isAuthLoading);

  useAuthenticatedIdleChunkPrefetch(
    () => import('./AppearanceDialog.tsx'),
    prefetchEnabled,
  );

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <AppearanceDialogInner />
    </Suspense>
  );
}
