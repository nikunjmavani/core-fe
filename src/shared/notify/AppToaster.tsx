import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import type { ToastPosition } from '@/shared/theme/index.ts';

/** Sonner sets `touch-action: none` on `[data-sonner-toast]` for swipe — override so buttons receive clicks. */
const TOAST_SURFACE_CLASS =
  'pointer-events-auto w-full max-w-[min(100vw-2rem,20rem)] touch-auto';

/**
 * App toast mount — reads toast position from the theme store. All app toasts
 * render via {@link CustomToast} (`notify` + `unstyled`); sonner only stacks
 * and positions them. Portaled to `document.body` so toasts stay above modals.
 *
 * Top-positioned toasts start BELOW the app header (h-14 + margin): at the raw
 * viewport edge they sit exactly on the notification bell / theme / user-menu
 * cluster, and while a toast lingers those controls can't be clicked.
 */
export function AppToaster() {
  const position = useThemeStore((s) => s.toastPosition) as ToastPosition;
  const clearsHeader = position.startsWith('top');
  return createPortal(
    <Toaster
      position={position}
      gap={10}
      visibleToasts={4}
      offset={clearsHeader ? { top: '4.5rem' } : undefined}
      mobileOffset={clearsHeader ? { top: '4rem' } : undefined}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: TOAST_SURFACE_CLASS,
        },
      }}
    />,
    document.body,
  );
}
