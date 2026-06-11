import { lazy, Suspense, useEffect } from 'react';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

const CommandPalette = lazy(() =>
  import('./CommandPalette.tsx').then((m) => ({
    default: m.CommandPalette,
  })),
);

/**
 * Lazy-loaded Command Palette — loads cmdk and palette UI only when first opened.
 * Keyboard listener is lightweight and always active.
 *
 * Uses store.getState() to avoid stale closure over `open` — the listener
 * is registered once and always reads the latest value.
 */
export function CommandPaletteLazy() {
  const open = useUIStore((s) => s.commandPaletteOpen);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <CommandPalette />
    </Suspense>
  );
}
