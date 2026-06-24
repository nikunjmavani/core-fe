import { Toaster } from 'sonner';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import type { ToastPosition } from '@/shared/theme/index.ts';

/**
 * App toast mount — a thin wrapper that reads the (TEMP) toast position from the
 * theme store, so it can be picked in Appearance and rolled by Shuffle. All app
 * toasts render the custom {@link CustomToast} via `notify`; sonner only handles
 * positioning + stacking + animation. Mount once at the route root.
 */
export function AppToaster() {
  const position = useThemeStore((s) => s.toastPosition) as ToastPosition;
  return <Toaster position={position} richColors closeButton />;
}
