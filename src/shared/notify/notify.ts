import { createElement } from 'react';
import { toast } from 'sonner';

import { CustomToast, type ToastType } from './CustomToast.tsx';

/**
 * The single application toast surface — the ONLY module (besides the `<Toaster>`
 * mount in the route tree) that imports `sonner`. Every level renders the shared
 * {@link CustomToast} via `toast.custom`, so the toast look — including the TEMP
 * design variants — has one home and one consistent API.
 *
 * @example
 *   notify.success('Saved');
 *   notify.error(mapApiError(err));
 *   notify.promise(save(), { loading: 'Saving…', success: 'Saved', error: 'Save failed' });
 */
export interface NotifyOptions {
  /** Stable id to de-dupe / replace an existing toast. */
  id?: string | number;
  /** Secondary line under the message. */
  description?: string;
  /** Auto-dismiss after N ms (omit for the default). */
  duration?: number;
}

function show(type: ToastType, message: string, opts?: NotifyOptions) {
  return toast.custom(
    (id) =>
      createElement(CustomToast, {
        id,
        type,
        title: message,
        description: opts?.description,
      }),
    // `unstyled` strips sonner's default chrome so CustomToast owns the look.
    { id: opts?.id, duration: opts?.duration, unstyled: true, className: 'w-full' },
  );
}

export const notify = {
  success: (message: string, opts?: NotifyOptions) => show('success', message, opts),
  error: (message: string, opts?: NotifyOptions) => show('error', message, opts),
  info: (message: string, opts?: NotifyOptions) => show('info', message, opts),
  warning: (message: string, opts?: NotifyOptions) => show('warning', message, opts),
  /** Drive a toast from a promise's lifecycle (loading → success / error). */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => toast.promise(promise, messages),
  /** Dismiss a toast by id, or all toasts when no id is given. */
  dismiss: (id?: string | number) => toast.dismiss(id),
};
