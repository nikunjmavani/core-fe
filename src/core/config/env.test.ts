import {
  config,
  resolveLayoutWidth,
  resolveThemeLock,
  resolveUseMockApi,
} from './env.ts';

describe('resolveUseMockApi', () => {
  it('is false in test mode', () => {
    expect(
      resolveUseMockApi({ mode: 'test', isProd: false, useMockApiFlag: undefined }),
    ).toBe(false);
  });

  it('is false in production even when flag is unset', () => {
    expect(
      resolveUseMockApi({ mode: 'production', isProd: true, useMockApiFlag: undefined }),
    ).toBe(false);
  });

  it('throws when mock is explicitly enabled in production', () => {
    expect(() =>
      resolveUseMockApi({ mode: 'production', isProd: true, useMockApiFlag: 'true' }),
    ).toThrow(/not allowed in production/i);
  });

  it('is true in development by default', () => {
    expect(
      resolveUseMockApi({
        mode: 'development',
        isProd: false,
        useMockApiFlag: undefined,
      }),
    ).toBe(true);
  });

  it('is false in development when VITE_USE_MOCK_API=false', () => {
    expect(
      resolveUseMockApi({
        mode: 'development',
        isProd: false,
        useMockApiFlag: 'false',
      }),
    ).toBe(false);
  });
});

describe('resolveLayoutWidth', () => {
  it('defaults to contained', () => {
    expect(resolveLayoutWidth(undefined)).toBe('contained');
    expect(resolveLayoutWidth('contained')).toBe('contained');
    expect(resolveLayoutWidth('anything-else')).toBe('contained');
  });

  it('returns full only for the explicit "full" flag', () => {
    expect(resolveLayoutWidth('full')).toBe('full');
  });
});

describe('resolveThemeLock', () => {
  it('is true only for the explicit "true" flag', () => {
    expect(resolveThemeLock('true')).toBe(true);
    expect(resolveThemeLock('false')).toBe(false);
    expect(resolveThemeLock(undefined)).toBe(false);
    expect(resolveThemeLock('1')).toBe(false);
  });
});

describe('config', () => {
  it('config.layoutWidth is contained or full', () => {
    expect(['contained', 'full']).toContain(config.layoutWidth);
  });

  it('config.themeLock is a boolean', () => {
    expect(typeof config.themeLock).toBe('boolean');
  });

  it('config.environment is a string', () => {
    expect(typeof config.environment).toBe('string');
    expect(['development', 'production', 'test']).toContain(config.environment);
  });

  it('config.isDevelopment is boolean', () => {
    expect(typeof config.isDevelopment).toBe('boolean');
  });

  it('config.apiBaseUrl is a string', () => {
    expect(typeof config.apiBaseUrl).toBe('string');
  });
});
