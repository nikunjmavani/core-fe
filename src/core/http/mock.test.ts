import { describe, expect, it } from 'vitest';

import { mockResponse } from './mock.ts';

describe('mockResponse', () => {
  it('resolves with the provided data', async () => {
    const data = { id: '1', name: 'Acme' };
    await expect(mockResponse(data, { delayMs: 0 })).resolves.toEqual(data);
  });

  it('returns a deep clone (callers cannot mutate the fixture)', async () => {
    const fixture = { nested: { count: 1 } };
    const result = await mockResponse(fixture, { delayMs: 0 });
    result.nested.count = 99;
    expect(fixture.nested.count).toBe(1);
  });

  it('rejects when failWith is provided', async () => {
    const error = new Error('boom');
    await expect(mockResponse({}, { delayMs: 0, failWith: error })).rejects.toThrow(
      'boom',
    );
  });

  it('waits roughly the requested delay', async () => {
    const start = Date.now();
    await mockResponse(null, { delayMs: 30 });
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});
