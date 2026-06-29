import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { notifySuccess, notifyDismiss, notifyInfo, notifyLoading } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyDismiss: vi.fn(),
  notifyInfo: vi.fn(),
  notifyLoading: vi.fn(),
}));

vi.mock('./notify.ts', () => ({
  notify: {
    success: notifySuccess,
    dismiss: notifyDismiss,
    info: notifyInfo,
    loading: notifyLoading,
  },
}));

import { notifyDeferredCommit } from './notify-deferred.ts';

describe('notifyDeferredCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs onCommit after the delay and shows then dismisses a processing toast', async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined);
    notifyDeferredCommit({
      pendingMessage: 'Removing…',
      processingMessage: 'Processing…',
      onCommit,
      delayMs: 100,
      toastId: 'remove-1',
    });
    expect(notifySuccess).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(notifyDismiss).toHaveBeenCalledWith('remove-1');
    expect(notifyLoading).toHaveBeenCalledWith('Processing…', {
      id: 'remove-1-processing',
    });
    expect(onCommit).toHaveBeenCalled();

    await Promise.resolve();
    expect(notifyDismiss).toHaveBeenCalledWith('remove-1-processing');
  });

  it('cancels onCommit when undo is clicked', () => {
    const onCommit = vi.fn();
    notifyDeferredCommit({
      pendingMessage: 'Removing…',
      onCommit,
      delayMs: 100,
      toastId: 'r',
    });
    const action = notifySuccess.mock.calls[0]?.[1]?.action;
    action?.onClick();
    vi.advanceTimersByTime(200);
    expect(onCommit).not.toHaveBeenCalled();
    expect(notifyInfo).toHaveBeenCalled();
  });

  it('cancels onCommit when the pending toast is dismissed', () => {
    const onCommit = vi.fn();
    notifyDeferredCommit({
      pendingMessage: 'Removing…',
      onCommit,
      delayMs: 100,
      toastId: 'r',
    });
    const onDismiss = notifySuccess.mock.calls[0]?.[1]?.onDismiss;
    onDismiss?.();
    vi.advanceTimersByTime(200);
    expect(onCommit).not.toHaveBeenCalled();
    expect(notifyLoading).not.toHaveBeenCalled();
  });
});
