import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Deliberately NO react-compiler here (vite.config.ts has it): coverage must
  // measure SOURCE branches, not the compiler's synthetic memo-cache checks
  // (which tripled the branch denominator and made the ratchet meaningless).
  // Compiled output is exercised by the e2e suite and the production build.
  plugins: [react()],
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
    // Projects (core-be pattern): `unit` = colocated src suites; `security` =
    // cross-cutting invariants under tests/security (token storage, redirect
    // safety, mock-mode rejection, header tripwires). `pnpm test` runs all;
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
        branches: 53,
        functions: 56,
        lines: 60,
        statements: 59,
      },
    },
  },
});
