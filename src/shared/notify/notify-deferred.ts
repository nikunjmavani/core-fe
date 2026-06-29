import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';

import { notify } from './notify.ts';

const DEFAULT_DELAY_MS = 5000;

/**
 * Show a success toast with Undo, then run `onCommit` after a short delay unless
 * the user cancels. While committing, swaps to a processing (loading) toast and
 * dismisses it when the work finishes. Closing the toast cancels the pending action.
 */
export function notifyDeferredCommit({
  pendingMessage,
  processingMessage,
  onCommit,
  delayMs = DEFAULT_DELAY_MS,
  toastId = 'deferred-commit',
}: {
  pendingMessage: string;
  /** Shown while `onCommit` runs; defaults to pending message. */
  processingMessage?: string;
  onCommit: () => void | Promise<void>;
  delayMs?: number;
  toastId?: string | number;
}) {
  let cancelled = false;
  const processingId = `${toastId}-processing`;

  const cancelPending = () => {
    cancelled = true;
    clearTimeout(timer);
  };

  const timer = setTimeout(() => {
    if (cancelled) return;
    notify.dismiss(toastId);
    notify.loading(processingMessage ?? pendingMessage, { id: processingId });
    Promise.resolve(onCommit())
      .finally(() => {
        notify.dismiss(processingId);
      })
      .catch(() => {
        /* onCommit surfaces its own errors; nothing to do here */
      });
  }, delayMs);

  notify.success(pendingMessage, {
    id: toastId,
    duration: delayMs + 800,
    onDismiss: cancelPending,
    action: {
      label: i18n.t(ERRORS_KEYS.toast.undo, { ns: ERRORS_NS }),
      onClick: () => {
        cancelPending();
        notify.dismiss(toastId);
        notify.info(i18n.t(ERRORS_KEYS.toast.undone, { ns: ERRORS_NS }), {
          id: `${toastId}-undone`,
        });
      },
    },
  });
}
