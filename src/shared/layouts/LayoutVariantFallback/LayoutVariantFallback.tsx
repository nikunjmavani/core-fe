import { FullPageSpinner } from '@/shared/components/FullPageSpinner/index.ts';

/** Lightweight suspense fallback while a layout variant chunk loads. */
export function LayoutVariantFallback() {
  return <FullPageSpinner />;
}
