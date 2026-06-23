import { describe, expect, it, vi } from 'vitest';

import { gateway } from './gateway.ts';

describe('gateway', () => {
  it('runs gates in order and threads the context', async () => {
    const calls: string[] = [];
    const run = gateway<{ n: number }>(
      (ctx) => {
        calls.push(`a:${ctx.n}`);
      },
      async (ctx) => {
        calls.push(`b:${ctx.n}`);
      },
    );

    await run({ n: 1 });

    expect(calls).toEqual(['a:1', 'b:1']);
  });

  it('short-circuits on the first gate that throws (later gates do not run)', async () => {
    const later = vi.fn();
    const run = gateway<unknown>(() => {
      throw new Error('halt');
    }, later);

    await expect(run({})).rejects.toThrow('halt');
    expect(later).not.toHaveBeenCalled();
  });

  it('rejects when an async gate rejects', async () => {
    const later = vi.fn();
    const run = gateway<unknown>(async () => {
      await Promise.reject(new Error('async-halt'));
    }, later);

    await expect(run({})).rejects.toThrow('async-halt');
    expect(later).not.toHaveBeenCalled();
  });

  it('passes when there are no gates', async () => {
    await expect(gateway<unknown>()({})).resolves.toBeUndefined();
  });
});
