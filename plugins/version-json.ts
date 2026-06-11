import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';

/**
 * Generates version.json at build time for cache busting and deployment detection.
 * - In dev: serves /version.json on the fly
 * - In prod: emits dist/version.json and injects VITE_APP_BUILD_ID for runtime comparison
 */
export function versionJson(): Plugin {
  const buildId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const versionDetails = {
    buildId,
    builtAt: new Date().toISOString(),
  };

  return {
    name: 'version-json',
    config() {
      return {
        define: {
          'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
        },
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        if (pathname.endsWith('version.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(
            JSON.stringify(
              { ...versionDetails, builtAt: new Date().toISOString() },
              null,
              2,
            ),
          );
          return;
        }
        next();
      });
    },
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      writeFileSync(
        resolve(outDir, 'version.json'),
        JSON.stringify({ ...versionDetails, builtAt: new Date().toISOString() }, null, 2),
      );
    },
  };
}
