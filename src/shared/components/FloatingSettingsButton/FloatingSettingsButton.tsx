import { config } from '@/core/config/env.ts';
import { Palette } from '@/shared/icons/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * A handle pinned to the right edge that opens the non-modal Appearance popup —
 * so the theme is one click away on EVERY layout (auth, public, app). Sits above
 * modals (z-70, pointer-events re-enabled), so it stays reachable even over an
 * open dialog. Hidden when the theme is locked by org config, or while the popup
 * is already open (the popup covers this spot).
 */
export function FloatingSettingsButton() {
  const appearanceOpen = useUIStore((s) => s.appearanceOpen);
  const setAppearanceOpen = useUIStore((s) => s.setAppearanceOpen);

  if (config.themeLock || appearanceOpen) return null;

  return (
    <button
      type="button"
      onClick={() => setAppearanceOpen(true)}
      aria-label="Open appearance"
      title="Appearance"
      data-testid="floating-settings"
      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring pointer-events-auto fixed top-1/2 right-0 z-[70] flex size-11 -translate-y-1/2 items-center justify-center rounded-l-2xl shadow-lg transition outline-none hover:-translate-x-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Palette className="size-5" aria-hidden="true" />
    </button>
  );
}
