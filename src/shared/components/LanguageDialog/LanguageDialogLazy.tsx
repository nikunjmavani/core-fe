import { useRouterState } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import {
  isAuthenticatedAppSurface,
  useAuthenticatedIdleChunkPrefetch,
} from '@/lib/chunk-prefetch.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

const LanguageDialogInner = lazy(() =>
  import('./LanguageDialog.tsx').then((m) => ({ default: m.LanguageDialog })),
);

/**
 * Lazy shell for the Language & region dialog — keeps the locale-studio chunk
 * out of the entry preload graph. Prefetched at idle on authenticated routes.
 */
export function LanguageDialogLazy() {
  const open = useUIStore((s) => s.languageOpen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const prefetchEnabled =
    !open && isAuthenticatedAppSurface(pathname, isAuthenticated, isAuthLoading);

  useAuthenticatedIdleChunkPrefetch(
    () => import('./LanguageDialog.tsx'),
    prefetchEnabled,
  );

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <LanguageDialogInner />
    </Suspense>
  );
}
