import { platformConfig } from '@/core/config/env.ts';
import { isMultiLocaleBuild } from '@/lib/i18n/build-runtime.ts';
import { FloatingLanguageButton } from '@/shared/components/FloatingLanguageButton/index.ts';
import { FloatingSettingsButton } from '@/shared/components/FloatingSettingsButton/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * Stacked right-edge quick actions — appearance (when unlocked) + language.
 * Hidden while either side panel (Appearance or Language) is open, since the
 * panel covers this strip.
 */
export function FloatingEdgeControls() {
  const appearanceOpen = useUIStore((s) => s.appearanceOpen);
  const languageOpen = useUIStore((s) => s.languageOpen);

  if (appearanceOpen || languageOpen) return null;

  return (
    <div
      className="pointer-events-none fixed top-1/2 right-0 z-[70] hidden -translate-y-1/2 flex-col gap-2 sm:flex"
      data-testid="floating-edge-controls"
    >
      {!platformConfig.themeLock ? <FloatingSettingsButton /> : null}
      {isMultiLocaleBuild() ? <FloatingLanguageButton /> : null}
    </div>
  );
}
