import { describe, expect, it, vi } from 'vitest';

const { toastMock } = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  });
  return { toastMock: fn };
});
vi.mock('sonner', () => ({ toast: toastMock }));

import { notify } from './notify.ts';

describe('notify', () => {
  it('forwards success / error / info / warning to sonner', () => {
    notify.success('ok');
    notify.error('bad');
    notify.info('fyi');
    notify.warning('careful');

    expect(toastMock.success).toHaveBeenCalledWith('ok', undefined);
    expect(toastMock.error).toHaveBeenCalledWith('bad', undefined);
    expect(toastMock).toHaveBeenCalledWith('fyi', undefined);
    expect(toastMock.warning).toHaveBeenCalledWith('careful', undefined);
  });

  it('passes options through (id / description / duration)', () => {
    notify.success('Saved', { id: 'save', duration: 1000 });
    expect(toastMock.success).toHaveBeenCalledWith('Saved', {
      id: 'save',
      duration: 1000,
    });
  });

  it('drives a toast from a promise', () => {
    const p = Promise.resolve(1);
    const messages = { loading: 'l', success: 's', error: 'e' };
    notify.promise(p, messages);
    expect(toastMock.promise).toHaveBeenCalledWith(p, messages);
  });
});
