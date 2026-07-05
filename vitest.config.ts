import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

import { i18nBuild } from './plugins/i18n-build.ts';

export default defineConfig({
  // Deliberately NO react-compiler here (vite.config.ts has it): coverage must
  // measure SOURCE branches, not the compiler's synthetic memo-cache checks
  // (which tripled the branch denominator and made the ratchet meaningless).
  // Compiled output is exercised by the e2e suite and the production build.
  plugins: [react(), i18nBuild({ modeFlag: 'multi', localeFlag: 'en-US' })],
  resolve: {
    alias: {
      '@/tests': path.resolve(__dirname, './tests'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/utils/setup.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e'],
    css: true,
    // Hermetic env: pin every behavior-affecting VITE_ flag to its canonical
    // value so the suite is identical on every machine and on CI, regardless of
    // any local `.env*` file. This is what keeps "passes on CI, fails locally"
    // structurally impossible — tests read platformConfig defaults, never a
    // developer's machine config. Values here mirror the schema defaults.
    env: {
      // Multi-locale so lazy-JSON i18n tests can load every namespace/locale.
      // Replaces the old `import.meta.env.MODE === 'test'` build-mode sniff.
      VITE_I18N_BUILD_MODE: 'multi',
      VITE_API_BASE_URL: '',
      VITE_LAYOUT_WIDTH: '',
      VITE_THEME_LOCK: '',
      VITE_DISABLED_MODULES: '',
      VITE_PERSONAL_ORGANIZATIONS: '',
      VITE_TEAM_ORGANIZATIONS: '',
      VITE_CAPTCHA_DISABLED: '',
      VITE_TURNSTILE_SITE_KEY: '',
      VITE_DEBUG_LOGGING: 'false',
      VITE_DEVTOOLS: 'false',
      VITE_E2E_HOOKS: 'false',
      VITE_VERSION_CHECK: 'false',
    },
    // Projects (core-be pattern): `unit` = colocated src suites; `security` =
    // cross-cutting invariants under tests/security (token storage, redirect
    // safety, header tripwires). `pnpm test` runs all;
    // `pnpm test:unit` / `pnpm test:security` target one project.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'src/**/*.{test,spec}.{ts,tsx}',
            'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'security',
          include: ['tests/security/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ci-policy',
          // Release/CI-flow invariants (core-be src/tests/unit/ci pattern):
          // workflow YAML wiring, release-please manifest shape, Dependabot
          // flow rules. Guards against silent drift like a renamed workflow
          // killing a workflow_run trigger.
          include: ['tests/ci/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // lcov feeds SonarQube (sonar.javascript.lcov.reportPaths);
      // json-summary feeds the CI job-summary coverage table.
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__tests__/**',
        'tests/**',
        'src/vite-env.d.ts',
      ],
      // Coverage RATCHET — pinned ~1% under measured coverage so CI fails on
      // regression, never on ambition. Raise (never lower) when coverage rises;
      // target is 80 as the auth/organization modules get rebuilt with tests.
      thresholds: {
        branches: 59,
        functions: 61,
        lines: 66,
        statements: 66,
      },
    },
  },
});
