import { config } from '@/core/config/env.ts';
import { Palette } from '@/shared/icons/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * A handle pinned to the right edge that opens the Appearance settings from
 * anywhere — so the theme is always one click away. `to: '.'` keeps the current
 * page and just sets the settings hash, so the modal overlays in place. Hidden
 * when signed out or when the theme is locked by org config. Sits below the modal
 * overlay (z-40), so opening Settings covers it.
 */
export function FloatingSettingsButton() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAppearanceOpen = useUIStore((s) => s.setAppearanceOpen);

  if (!isAuthenticated || config.themeLock) return null;

  return (
    <button
      type="button"
      onClick={() => setAppearanceOpen(true)}
      aria-label="Open appearance settings"
      title="Appearance"
      data-testid="floating-settings"
      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring fixed top-1/2 right-0 z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-l-2xl shadow-lg transition outline-none hover:-translate-x-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Palette className="size-5" aria-hidden="true" />
    </button>
  );
}
