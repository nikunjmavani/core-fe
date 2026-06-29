/**
 * Sync `.env.example` with env schema keys.
 *
 * Usage:
 *   pnpm tool:sync-env-example
 *   pnpm tool:sync-env-example --fix
 */
import '../load-env-files.mjs';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { envSchemaKeys } from '../../src/core/config/env-schema.ts';

const projectRoot = resolve(import.meta.dirname, '../..');
const envExamplePath = resolve(projectRoot, '.env.example');

function parseDocumentedKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const lineRe = /^(?:#\s*)?([A-Z][A-Z0-9_]*)\s*=/;
  for (const line of content.split('\n')) {
    const match = line.trim().match(lineRe);
    if (match?.[1]) keys.add(match[1]);
  }
  return keys;
}

function main(): void {
  const fix = process.argv.includes('--fix');
  if (!existsSync(envExamplePath)) {
    console.error('[sync-env-example] .env.example not found');
    process.exit(1);
  }

  const content = readFileSync(envExamplePath, 'utf-8');
  const documented = parseDocumentedKeys(content);
  const missing = envSchemaKeys.filter((key) => !documented.has(key));

  if (missing.length === 0) {
    console.log('[sync-env-example] .env.example documents all schema keys.');
    process.exit(0);
  }

  console.error(
    `[sync-env-example] Missing ${missing.length} key(s): ${missing.join(', ')}`,
  );

  if (!fix) {
    process.exit(1);
  }

  const appendix = [
    '',
    '# --- Appended by pnpm tool:sync-env-example --fix ---',
    ...missing.map((key) => `${key}=`),
    '',
  ].join('\n');

  writeFileSync(envExamplePath, content.trimEnd() + appendix, 'utf-8');
  console.log('[sync-env-example] Appended missing keys to .env.example');
}

main();
