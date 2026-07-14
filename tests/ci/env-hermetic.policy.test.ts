import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

/**
 * Hermetic-env guard. The default mode is now `local`, whose env file is
 * `.env.local` — and Vite loads `.env.local` in EVERY mode, including the Vitest
 * `test` mode. If that were allowed, a developer's local `.env.local` would leak
 * into the suite and it would stop being reproducible across machines and CI.
 * `vitest.config.ts` prevents it by pointing `envDir` at an empty directory, so
 * the test runner loads no `.env` files at all. These two checks keep that wiring
 * from silently regressing (which would only surface as flaky, machine-dependent
 * tests once someone actually had a `.env.local`).
 */
describe('test env hermeticity', () => {
  it('vitest.config.ts points envDir at the empty env dir', () => {
    const config = readFileSync(join(ROOT, 'vitest.config.ts'), 'utf8');
    expect(config).toMatch(
      /envDir:\s*path\.resolve\(__dirname,\s*['"]tooling\/test\/empty-env['"]\)/,
    );
  });

  it('the empty env dir exists and holds no .env files', () => {
    const dir = join(ROOT, 'tooling/test/empty-env');
    expect(existsSync(dir)).toBe(true);
    const envFiles = readdirSync(dir).filter((name) => name.startsWith('.env'));
    expect(envFiles).toEqual([]);
  });
});
