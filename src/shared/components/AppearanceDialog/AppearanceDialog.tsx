import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog.tsx';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';

import { AppearancePanel } from './AppearancePanel.tsx';

/**
 * Dedicated Appearance dialog — the single home for theme config, opened by the
 * floating handle (and the dashboard "Customize"). Deliberately separate from the
 * Settings modal so theming has its own surface. Open state lives in useUIStore;
 * the header stays fixed while the controls scroll.
 */
export function AppearanceDialog() {
  const open = useUIStore((s) => s.appearanceOpen);
  const setOpen = useUIStore((s) => s.setAppearanceOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]"
        data-testid="appearance-dialog"
      >
        <DialogHeader className="border-border space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>
            Make the workspace yours — saved on this device.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <AppearancePanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
