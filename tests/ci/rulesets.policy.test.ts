import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the single-trunk model: exactly ONE committed branch ruleset, targeting
// `main` only. A second ruleset file or a non-main branch target (e.g. a
// resurrected `dev.json`) fails here — this is the committed side of
// "one trunk, one ruleset"; the remote side is enforced by
// `pnpm github:sync --prune`, which deletes any remote branch ruleset not in
// this directory.
const RULESETS_DIR = join(process.cwd(), '.github/rulesets');

/** @returns {{ fileName: string, payload: any }[]} */
function loadRulesets() {
  return readdirSync(RULESETS_DIR)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
    .map((fileName) => ({
      fileName,
      payload: JSON.parse(readFileSync(join(RULESETS_DIR, fileName), 'utf8')),
    }));
}

describe('branch rulesets policy (one trunk, one ruleset)', () => {
  const rulesets = loadRulesets();

  it('commits exactly one ruleset file — main.json', () => {
    expect(rulesets.map((ruleset) => ruleset.fileName)).toEqual(['main.json']);
  });

  it('is a branch ruleset that targets main only (no dev or other branch)', () => {
    for (const { fileName, payload } of rulesets) {
      expect(payload.target, `${fileName}: target`).toBe('branch');
      expect(
        payload?.conditions?.ref_name?.include,
        `${fileName}: ref_name.include`,
      ).toEqual(['refs/heads/main']);
      expect(
        payload?.conditions?.ref_name?.exclude ?? [],
        `${fileName}: ref_name.exclude`,
      ).toEqual([]);
    }
  });

  it('is named "Protect main" (the name the drift guard and sync match on)', () => {
    expect(rulesets[0]?.payload?.name).toBe('Protect main');
  });
});
