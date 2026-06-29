/**
 * Fail when `import.meta.env.VITE_*` is read outside the allowlisted surfaces.
 * Keeps build-injected env on `lib/i18n/build-env.ts` and runtime overrides on
 * `env.config.ts` instead of scattered direct reads.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

/** Paths relative to repo root that may read `import.meta.env.VITE_*`. */
const ALLOWLIST = new Set(['src/lib/i18n/build-env.ts', 'src/core/config/env.config.ts']);

/**
 * @param {string} dir
 * @param {string[]} files
 */
function walkTs(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walkTs(path, files);
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

const VITE_READ = /import\.meta\.env\.VITE_[A-Z0-9_]+/;

const violations = [];
for (const file of walkTs(resolve(ROOT, 'src'))) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, 'utf8');
  if (!VITE_READ.test(content)) continue;
  if (ALLOWLIST.has(rel)) continue;
  violations.push(rel);
}

if (violations.length > 0) {
  console.error('Direct import.meta.env.VITE_* reads outside allowlist:');
  for (const file of violations.sort()) {
    console.error(`  ${file}`);
  }
  console.error('');
  console.error(
    'Route reads through lib/i18n/build-env.ts or env.config.ts getRuntimeConfigValue().',
  );
  process.exit(1);
}

console.log('vite-env-reads: OK (allowlist only)');
