import { toast } from 'sonner';

/**
 * The single application toast surface — the ONLY module that imports `sonner`
 * (besides the `<Toaster>` mount in the route tree). Every call site goes
 * through `notify`, so toast behaviour (durations, de-dupe ids, a11y, future
 * theming) has one place to evolve and one consistent API.
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

export const notify = {
  success: (message: string, opts?: NotifyOptions) => toast.success(message, opts),
  error: (message: string, opts?: NotifyOptions) => toast.error(message, opts),
  info: (message: string, opts?: NotifyOptions) => toast(message, opts),
  warning: (message: string, opts?: NotifyOptions) => toast.warning(message, opts),
  /** Drive a toast from a promise's lifecycle (loading → success / error). */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => toast.promise(promise, messages),
  /** Dismiss a toast by id, or all toasts when no id is given. */
  dismiss: (id?: string | number) => toast.dismiss(id),
};
