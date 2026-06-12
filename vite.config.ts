import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { cspApiOrigin } from './plugins/csp-api-origin.ts';
import { versionJson } from './plugins/version-json.ts';

export default defineConfig(({ mode }) => {
  // Env files at project root: .env, .env.development, .env.production, .env.local
  const envDir = path.resolve(__dirname);
  const env = loadEnv(mode, envDir, '');

  return {
    envDir,
    plugins: [
      // React Compiler: automatic memoization at build time (React 19).
      // The eslint react-hooks rules already lint for compiler compatibility.
      react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
      tailwindcss(),
      versionJson(),
      cspApiOrigin(env.VITE_API_BASE_URL, env.VITE_CSP_REPORT_URI),

      // PWA — injectManifest mode avoids workbox-build/terser race condition in Vite 7
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['vite.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: false, // Use public/manifest.webmanifest directly
        disable: mode !== 'production',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        },
      }),

      // Bundle analyzer — only when ANALYZE=true
      ...(process.env.ANALYZE
        ? [
            visualizer({
              filename: 'dist/stats.html',
              open: true,
              gzipSize: true,
            }) as PluginOption,
          ]
        : []),

      // Sentry source map upload — only in production builds when credentials are present.
      // Source maps are uploaded then deleted from the output so they're never served publicly.
      // The plugin must be listed AFTER all other plugins.
      ...(mode === 'production' && env.SENTRY_AUTH_TOKEN
        ? [
            sentryVitePlugin({
              org: env.VITE_SENTRY_ORG,
              project: env.VITE_SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              release: {
                name: env.VITE_APP_VERSION || undefined,
              },
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/assets/*.map'],
              },
              telemetry: false,
            }) as PluginOption,
          ]
        : []),
    ],

    resolve: {
      alias: {
        '@/tests': path.resolve(__dirname, './tests'),
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 5173,
      strictPort: false,
      proxy:
        mode === 'development'
          ? {
              '/api': {
                target: env.VITE_DEV_API_URL || 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
              },
            }
          : undefined,
    },

    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    build: {
      outDir: 'dist',
      // 'hidden' in production: generates source maps for Sentry upload but doesn't
      // reference them in bundles (so they're never served to end users).
      // true in dev/preview for easy debugging.
      sourcemap: mode === 'development' ? true : 'hidden',
      assetsInlineLimit: 0,
      // Content hashes in filenames for cache busting — new builds get new URLs
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules/@sentry')) return 'sentry';
            if (id.includes('node_modules/posthog-js')) return 'posthog';
            if (id.includes('node_modules/recharts')) return 'charts';
            if (id.includes('node_modules/zod')) return 'zod';
            if (id.includes('node_modules/react-hook-form')) return 'rhf';
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/@tanstack/react-router')
            ) {
              return 'vendor';
            }
            if (id.includes('node_modules/@tanstack/react-query')) return 'query';
            // NO manual chunk for cmdk: it is only ever dynamically imported
            // (CommandPaletteLazy), so natural splitting already isolates it.
            // Forcing it into a named chunk made rollup hoist a shared radix
            // helper there, statically chaining the whole chunk to the entry.
          },
        },
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
});
