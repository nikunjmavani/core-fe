import { describe, expect, it, vi } from 'vitest';

const { toastMock } = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    custom: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  });
  return { toastMock: fn };
});
vi.mock('sonner', () => ({ toast: toastMock }));

import { notify } from './notify.ts';

describe('notify', () => {
  it('renders a custom toast per level (success / error / info / warning)', () => {
    notify.success('ok');
    notify.error('bad');
    notify.info('fyi');
    notify.warning('careful');

    expect(toastMock.custom).toHaveBeenCalledTimes(4);
    // The first arg is a render fn that builds a CustomToast element; invoking it
    // lets us assert the level + message wired through.
    const types = toastMock.custom.mock.calls.map((call) => {
      const render = call[0] as (id: string) => {
        props: { type: string; title: string };
      };
      return render('toast-id').props;
    });
    expect(types.map((p) => p.type)).toEqual(['success', 'error', 'info', 'warning']);
    expect(types[0]?.title).toBe('ok');
  });

  it('passes options through (id / description / duration)', () => {
    notify.success('Saved', { id: 'save', description: 'All set', duration: 1000 });
    const lastCall = toastMock.custom.mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ id: 'save', duration: 1000, unstyled: true });
    const render = lastCall?.[0] as (id: string) => { props: { description?: string } };
    expect(render('x').props.description).toBe('All set');
  });

  it('drives a toast from a promise', () => {
    const p = Promise.resolve(1);
    const messages = { loading: 'l', success: 's', error: 'e' };
    notify.promise(p, messages);
    expect(toastMock.promise).toHaveBeenCalledWith(p, messages);
  });

  it('dismisses by id', () => {
    notify.dismiss('save');
    expect(toastMock.dismiss).toHaveBeenCalledWith('save');
  });
});
