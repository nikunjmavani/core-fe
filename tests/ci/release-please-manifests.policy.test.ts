import { existsSync, readFileSync } from 'node:fs';
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

// Single-trunk model (delivery-model migration §12.2): one stable channel only.
// The dev prerelease channel (config.dev.json / manifest.dev.json / CHANGELOG-dev.md)
// is retired — asserting they are GONE guards against an accidental reintroduction.
describe('release-please manifest policy (single channel)', () => {
  it('the dev prerelease channel files no longer exist', () => {
    expect(existsSync(join(RELEASE_PLEASE_DIR, 'config.dev.json'))).toBe(false);
    expect(existsSync(join(RELEASE_PLEASE_DIR, 'manifest.dev.json'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'CHANGELOG-dev.md'))).toBe(false);
  });

  it('stable config keeps prerelease mode disabled', () => {
    const config = readJson<ReleasePleaseConfig>('config.json');
    expect(config.prerelease ?? false).toBe(false);
    expect(config['prerelease-type']).toBeUndefined();
  });

  it('stable config publishes releases immediately so release-please does not re-count draft releases', () => {
    const config = readJson<ReleasePleaseConfig>('config.json');
    expect(config.draft ?? false).toBe(false);
  });

  it('stable manifest version is plain MAJOR.MINOR.PATCH', () => {
    const manifest = readJson<ReleasePleaseManifest>('manifest.json');
    expect(manifest['.']).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
