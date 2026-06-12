/**
 * Security invariant: the REPLACE_WITH_API mock layer (demo credentials,
 * seeded fixtures) can never be active in a deployed build. Production and
 * staging hard-fail when the flag is forced on; test mode is always real.
 */
import { describe, expect, it } from 'vitest';

import { resolveUseMockApi } from '@/core/config/env.ts';

describe('resolveUseMockApi (security)', () => {
  it('throws when a production build forces mocks on', () => {
    expect(() =>
      resolveUseMockApi({ mode: 'production', isProd: true, useMockApiFlag: 'true' }),
    ).toThrow('not allowed in production or staging builds');
  });

  it('throws when a staging build forces mocks on', () => {
    expect(() =>
      resolveUseMockApi({ mode: 'staging', isProd: false, useMockApiFlag: 'true' }),
    ).toThrow('not allowed in production or staging builds');
  });

  it('is always false in deployed builds regardless of the flag', () => {
    expect(
      resolveUseMockApi({ mode: 'production', isProd: true, useMockApiFlag: undefined }),
    ).toBe(false);
    expect(
      resolveUseMockApi({ mode: 'production', isProd: true, useMockApiFlag: 'false' }),
    ).toBe(false);
    expect(
      resolveUseMockApi({ mode: 'staging', isProd: false, useMockApiFlag: 'false' }),
    ).toBe(false);
  });

  it('is always false in test mode (unit tests hit explicit doubles, not the mock layer)', () => {
    expect(
      resolveUseMockApi({ mode: 'test', isProd: false, useMockApiFlag: 'true' }),
    ).toBe(false);
  });

  it('defaults on in development and respects an explicit opt-out', () => {
    expect(
      resolveUseMockApi({
        mode: 'development',
        isProd: false,
        useMockApiFlag: undefined,
      }),
    ).toBe(true);
    expect(
      resolveUseMockApi({ mode: 'development', isProd: false, useMockApiFlag: 'false' }),
    ).toBe(false);
  });
});
