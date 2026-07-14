import type { Plugin, UserConfig } from 'vite';

/**
 * Cross-cutting test-environment defaults for Vitest, injected via `test.env`.
 *
 * These are genuine test-runner requirements (not app behavior defaults, which
 * come from the schema) — kept here so app code stays free of build-mode sniffing
 * (`import.meta.env.MODE === 'test'` / `platformConfig.environment === 'test'`).
 *
 * One switch: `VITE_TEST_MODE=on` — the umbrella that disables the captcha gate
 * (so auth suites never mount a real Turnstile widget) and forces the test
 * affordances (`devtools`, `e2eHooks`) on. All test-runner config flows from it,
 * so this plugin never juggles individual flags. i18n build vars are injected
 * separately by the i18n-build plugin.
 */
export function coreFeTestEnv(): Plugin {
  return {
    name: 'core-fe-test-env',
    config() {
      return {
        test: { env: { VITE_TEST_MODE: 'on' } },
      } as Omit<UserConfig, 'plugins'>;
    },
  };
}
