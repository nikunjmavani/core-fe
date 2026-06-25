import { useEffect } from 'react';

import { X } from '@/shared/icons/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

import { AppearancePanel } from './AppearancePanel.tsx';

/**
 * Dedicated Appearance popup — a NON-MODAL side panel pinned to the right edge.
 * No scrim, no focus trap, no scroll lock: the page behind stays fully visible +
 * interactive while you tweak the theme. Sits above modals and any other layer
 * (z-80, pointer-events re-enabled), and is mounted at the route root, so it works
 * on every layout — auth, public, and app. Open state lives in useUIStore; Esc or
 * the close button dismisses it.
 */
export function AppearanceDialog() {
  const open = useUIStore((s) => s.appearanceOpen);
  const setOpen = useUIStore((s) => s.setAppearanceOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="appearance-popover-title"
      data-testid="appearance-dialog"
      className="bg-popover text-popover-foreground border-border animate-in slide-in-from-right-2 fade-in pointer-events-auto fixed top-4 right-4 z-[80] flex max-h-[calc(100dvh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border shadow-2xl duration-200"
    >
      <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-3">
        <div className="space-y-0.5">
          <h2 id="appearance-popover-title" className="text-sm font-semibold">
            Appearance
          </h2>
          <p className="text-muted-foreground text-xs">
            Saved on this device — changes apply live.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          data-testid="appearance-close"
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1.5 transition outline-none focus-visible:ring-2"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <AppearancePanel />
      </div>
    </aside>
  );
}
