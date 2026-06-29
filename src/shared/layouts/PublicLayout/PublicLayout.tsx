import { lazy, Suspense } from 'react';

import { LayoutVariantFallback } from '@/shared/layouts/LayoutVariantFallback/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

const CenteredPublic = lazy(() =>
  import('./variants/PublicLayoutCentered.tsx').then((m) => ({
    default: m.CenteredPublic,
  })),
);
const CardPublic = lazy(() =>
  import('./variants/PublicLayoutCard.tsx').then((m) => ({ default: m.CardPublic })),
);
const BrandPublic = lazy(() =>
  import('./variants/PublicLayoutBrand.tsx').then((m) => ({ default: m.BrandPublic })),
);

const PUBLIC_SHELLS = [CenteredPublic, CardPublic, BrandPublic] as const;

/**
 * Minimal centered chrome for public, non-app routes — `/callback`, `/unauthorized`,
 * `/onboarding`, `/accept-invite/$id`, and the 404. Three TEMP preview shells
 * (centered, card, brand) lazy-load via `publicVariant` (Shuffle cycles).
 */
export function PublicLayout() {
  const variant = useThemeStore((s) => s.publicVariant);
  const Shell = PUBLIC_SHELLS[variant] ?? CenteredPublic;

  return (
    <Suspense fallback={<LayoutVariantFallback />}>
      <Shell />
    </Suspense>
  );
}
