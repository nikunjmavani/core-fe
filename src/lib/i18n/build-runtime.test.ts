import { afterEach, describe, expect, it, vi } from 'vitest';

describe('build-runtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('treats multi when VITE_I18N_BUILD_MODE is multi', async () => {
    vi.stubEnv('VITE_I18N_BUILD_MODE', 'multi');
    vi.stubEnv('MODE', 'production');
    const { isMultiLocaleBuild, I18N_BUILD_MODE } = await import('./build-runtime.ts');
    expect(I18N_BUILD_MODE).toBe('multi');
    expect(isMultiLocaleBuild()).toBe(true);
  });

  it('defaults to single for unknown build mode flags in production', async () => {
    vi.stubEnv('VITE_I18N_BUILD_MODE', 'weird');
    vi.stubEnv('MODE', 'production');
    const { isSingleLocaleBuild, I18N_BUILD_MODE } = await import('./build-runtime.ts');
    expect(I18N_BUILD_MODE).toBe('single');
    expect(isSingleLocaleBuild()).toBe(true);
  });

  it('defaults to single when the build flag is omitted — no build-mode sniffing', async () => {
    // The mode is purely env-driven now (VITE_I18N_BUILD_MODE); there is no
    // `MODE === 'test'` special case. The test suite gets `multi` from
    // vitest.config `test.env`, not from an implicit vitest-detection branch.
    vi.stubEnv('VITE_I18N_BUILD_MODE', '');
    const { isSingleLocaleBuild, I18N_BUILD_MODE } = await import('./build-runtime.ts');
    expect(I18N_BUILD_MODE).toBe('single');
    expect(isSingleLocaleBuild()).toBe(true);
  });
});
