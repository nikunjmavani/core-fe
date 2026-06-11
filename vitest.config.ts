import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'tests/e2e'],
    css: true,
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
        functions: 52,
        lines: 57,
        statements: 57,
      },
    },
  },
});
