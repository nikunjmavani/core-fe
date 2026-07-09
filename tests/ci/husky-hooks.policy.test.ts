import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the local git-hook invariants that back the CI gates. The pre-push hook
// is the first line of defense before a push reaches CI — if a guard is deleted
// here it silently stops running, so pin its presence.
const hook = (name: string): string =>
  readFileSync(join(process.cwd(), '.husky', name), 'utf8');

describe('husky hooks policy', () => {
  const prePush = hook('pre-push');

  it('pre-push enforces the <type>/<description> branch-name policy', () => {
    // The conventional-type prefixes a branch must start with.
    expect(prePush).toMatch(
      /\^\(feat\|fix\|chore\|ci\|docs\|refactor\|test\|perf\|build\|style\|revert\)/,
    );
  });

  it('pre-push resolves the trunk from config, never a hardcoded branch name', () => {
    // The default branch is read from setup.config.json so a renamed trunk stays
    // exempt without editing the hook.
    expect(prePush).toContain('setup.config.json');
    expect(prePush).toContain('defaultBranch');
  });

  it('pre-push exempts the trunk and a detached HEAD from the branch-name check', () => {
    expect(prePush).toContain('!= "HEAD"');
    expect(prePush).toContain('!= "$DEFAULT_BRANCH"');
  });
});
