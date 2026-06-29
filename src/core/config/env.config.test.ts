import { afterEach, describe, expect, it } from 'vitest';

import { getClientEnv, resetClientEnvCacheForTests } from './env.config.ts';

describe('env.config', () => {
  afterEach(() => {
    resetClientEnvCacheForTests();
  });

  it('getClientEnv caches the parsed client env', () => {
    const first = getClientEnv();
    const second = getClientEnv();
    expect(first).toBe(second);
  });

  it('resetClientEnvCacheForTests clears the cache', () => {
    const first = getClientEnv();
    resetClientEnvCacheForTests();
    const second = getClientEnv();
    expect(second).not.toBe(first);
    expect(second.MODE).toBe(first.MODE);
  });
});
