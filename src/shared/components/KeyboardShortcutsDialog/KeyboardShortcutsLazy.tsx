import { lazy, Suspense, useEffect } from 'react';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

const KeyboardShortcutsDialog = lazy(() =>
  import('./KeyboardShortcutsDialog.tsx').then((m) => ({
    default: m.KeyboardShortcutsDialog,
  })),
);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
  );
}

/**
 * Lazy-loaded shortcuts dialog. Registers global `?` and Cmd/Ctrl+/ listeners.
 */
export function KeyboardShortcutsLazy() {
  const open = useUIStore((s) => s.shortcutsOpen);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (e.key === '?' && !meta && !e.altKey) {
        e.preventDefault();
        useUIStore.getState().setShortcutsOpen(true);
        return;
      }
      if (meta && e.key === '/') {
        e.preventDefault();
        useUIStore.getState().setShortcutsOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <KeyboardShortcutsDialog />
    </Suspense>
  );
}
