import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      sonarjs.configs.recommended,
      security.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      // ── Import ordering + dead imports ──
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // ── Complexity & structure ──
      'max-depth': ['warn', 4],
      'max-lines-per-function': [
        'warn',
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['warn', 15],

      // TODOs are tracked; don't block production on them
      'sonarjs/todo-tag': 'warn',

      // ── Security (built-in) ──
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-param-reassign': 'error',
    },
  },

  // Icons flow through the @/shared/icons barrel so the icon library is
  // swappable in one file. Vendored shadcn primitives and the barrel itself
  // are the only direct lucide importers.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/icons/**', 'src/shared/components/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              message:
                "Import icons from '@/shared/icons/index.ts' (one-file icon-library swap).",
            },
          ],
        },
      ],
    },
  },

  // React Router lazy route modules export Component + loader/action/ErrorBoundary
  {
    files: ['**/pages/**/*.route.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowExportNames: ['loader', 'action', 'ErrorBoundary'] },
      ],
    },
  },

  // shadcn/ui components export variant definitions alongside components
  {
    files: ['**/shared/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Test files — relax rules that produce noise on fixtures/mocks
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'sonarjs/slow-regex': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // E2E test utilities — fixtures, unique IDs for isolation
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/pseudo-random': 'off',
    },
  },

  // Build plugins — non-security random, fs writes to known paths
  {
    files: ['plugins/**/*.ts'],
    rules: {
      'sonarjs/pseudo-random': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },

  // API/route path constants (strings like /auth/reset-password), not credentials
  {
    files: ['**/core/config/constants.ts'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
    },
  },

  // FeatureFlagProvider exports provider + hooks by design
  {
    files: ['**/app/analytics/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // ── Layer boundaries: ui → lib → core → shared → pages → app ──
  // One-way dependency rule from agent-os/rules/file-structure.mdc, enforced on
  // production code (test files may cross layers for mocks/fixtures).
  // KNOWN DEBT files are exempted explicitly — shrink these lists by relocating
  // the code; never extend them.
  {
    files: ['src/lib/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/shared/**', '@/pages/**', '@/app/**'],
              message:
                'src/lib is the bottom layer — pure utilities only (lib may import lib and core/types).',
            },
            {
              // lib may reach core ONLY for shared type definitions
              regex: '^@/core/(?!types/)',
              message:
                'src/lib may import from core only @/core/types (see file-structure.mdc → Import Rules).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**', '@/app/**'],
              message: 'src/core must never import pages or app.',
            },
            {
              // Runtime-trio exception (file-structure.mdc → Import Rules): the
              // kernel may read auth runtime, error reporting, and the
              // auth/tenant stores. Everything else in shared is off-limits.
              regex:
                '^@/shared/(?!auth/|errors/|store/useAuthStore/|store/useOrganizationStore/)',
              message:
                'src/core may import from shared ONLY the runtime trio: @/shared/auth, @/shared/errors, useAuthStore, useOrganizationStore (see file-structure.mdc → Import Rules).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**', '@/app/**'],
              message:
                'src/shared must not depend on pages or app (shared may import core/lib).',
            },
          ],
        },
      ],
    },
  },
  // shadcn primitives: strictest layer — only other ui primitives and lib
  {
    files: ['src/shared/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // everything internal except @/lib and other ui primitives
              regex: '^@/(core|pages|app)/|^@/shared/(?!components/ui/)',
              message: 'UI primitives may import only @/lib and other ui primitives.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**'],
              message:
                'Pages never import other pages — use relative imports within an island; share cross-page code via src/shared.',
            },
            {
              group: ['@/app/**'],
              message: 'Pages must not import the app shell.',
            },
          ],
        },
      ],
    },
  },
]);
