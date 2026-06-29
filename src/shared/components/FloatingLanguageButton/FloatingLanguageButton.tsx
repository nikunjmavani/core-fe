import { useTranslation } from 'react-i18next';

import { LOCALE_KEYS, LOCALE_NS, LOCALE_TEST_IDS } from '@/lib/i18n/locale.constants.ts';
import { iconOnPrimarySurface } from '@/lib/icon-surface.ts';
import { cn } from '@/lib/utils.ts';
import { floatingEdgeButtonClassName } from '@/shared/components/FloatingEdgeControls/floating-edge-button.ts';
import { Languages } from '@/shared/icons/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

/**
 * Right-edge language handle — opens the non-modal Language & region side panel
 * (mirrors the Appearance handle) so language + regional formatting are one click
 * away on EVERY layout. Rendered inside {@link FloatingEdgeControls}; the panel
 * itself is {@link LanguageDialog}.
 */
export function FloatingLanguageButton() {
  const { t } = useTranslation(LOCALE_NS);
  const setLanguageOpen = useUIStore((s) => s.setLanguageOpen);

  return (
    <button
      type="button"
      onClick={() => setLanguageOpen(true)}
      aria-label={t(LOCALE_KEYS.openAria)}
      title={t(LOCALE_KEYS.title)}
      data-testid={LOCALE_TEST_IDS.floatingLanguage}
      data-slot="floating-edge"
      className={floatingEdgeButtonClassName}
    >
      <Languages className={cn('size-5', iconOnPrimarySurface)} aria-hidden="true" />
    </button>
  );
}
