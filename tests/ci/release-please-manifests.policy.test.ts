import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const RELEASE_PLEASE_DIR = join(process.cwd(), '.github/release-please');

interface ReleasePleaseConfig {
  draft?: boolean;
  prerelease?: boolean;
  'prerelease-type'?: string;
  versioning?: string;
}

interface ReleasePleaseManifest {
  '.': string;
}

function readJson<TValue>(relativePath: string): TValue {
  return JSON.parse(
    readFileSync(join(RELEASE_PLEASE_DIR, relativePath), 'utf8'),
  ) as TValue;
}

// Ported from core-be src/tests/unit/ci/release-please-manifests.policy.unit.test.ts.
// The `node` release-type only honors prerelease mode when the manifest already
// carries a `-dev.N` suffix — a reseed mistake here silently derails the dev channel.
describe('release-please manifest policy', () => {
  it('dev config keeps prerelease mode enabled with the `dev` identifier', () => {
    const config = readJson<ReleasePleaseConfig>('config.dev.json');
    expect(config.prerelease).toBe(true);
    expect(config['prerelease-type']).toBe('dev');
  });

  it('dev config uses prerelease versioning so dev releases advance dev.N instead of recalculating the base version', () => {
    const config = readJson<ReleasePleaseConfig>('config.dev.json');
    expect(config.versioning).toBe('prerelease');
  });

  it('dev manifest version ends with `-dev.<n>` while config.dev.json has prerelease enabled', () => {
    const config = readJson<ReleasePleaseConfig>('config.dev.json');
    const manifest = readJson<ReleasePleaseManifest>('manifest.dev.json');
    const devVersion = manifest['.'];

    if (config.prerelease !== true) {
      return;
    }

    expect(
      devVersion,
      `manifest.dev.json must end with -dev.<n> while config.dev.json declares prerelease: true (found "${devVersion}")`,
    ).toMatch(/^\d+\.\d+\.\d+-dev\.\d+$/);
  });

  it('stable config keeps prerelease mode disabled', () => {
    const config = readJson<ReleasePleaseConfig>('config.json');
    expect(config.prerelease ?? false).toBe(false);
  });

  it('stable config publishes releases immediately so release-please does not re-count draft releases', () => {
    const config = readJson<ReleasePleaseConfig>('config.json');
    expect(config.draft ?? false).toBe(false);
  });

  it('stable manifest version is plain MAJOR.MINOR.PATCH (pre-1.0 -alpha.N seed allowed until the first stable release)', () => {
    const manifest = readJson<ReleasePleaseManifest>('manifest.json');
    expect(manifest['.']).toMatch(/^\d+\.\d+\.\d+(-alpha\.\d+)?$/);
  });

  it('stable and dev manifests are not more than one major version apart', () => {
    const stable = readJson<ReleasePleaseManifest>('manifest.json')['.'];
    const dev = readJson<ReleasePleaseManifest>('manifest.dev.json')['.'];

    const stableMajor = Number.parseInt(stable.split('.')[0] ?? '', 10);
    const devMajor = Number.parseInt(dev.split('.')[0] ?? '', 10);

    expect(Number.isFinite(stableMajor)).toBe(true);
    expect(Number.isFinite(devMajor)).toBe(true);
    expect(
      devMajor - stableMajor,
      `dev manifest (${dev}) drifted from stable manifest (${stable}) by more than one major version`,
    ).toBeLessThanOrEqual(1);
    expect(
      devMajor - stableMajor,
      `dev manifest (${dev}) is behind stable manifest (${stable})`,
    ).toBeGreaterThanOrEqual(0);
  });
});
