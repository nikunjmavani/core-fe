import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the scheduled release-flow guards: the weekly canaries that catch
// release-cycle drift while it is still a notification, not a stuck release.
const GUARDS_WORKFLOW = join(
  process.cwd(),
  '.github/workflows/scheduled-release-guards.yml',
);

describe('release-flow guards policy', () => {
  const workflow = readFileSync(GUARDS_WORKFLOW, 'utf8');

  it('runs weekly on Monday 06:30 with manual dispatch', () => {
    expect(workflow).toContain("cron: '30 6 * * 1'");
    expect(workflow).toContain('workflow_dispatch:');
  });

  it('keeps the environment + ruleset drift job', () => {
    expect(workflow).toMatch(/^ {2}environment-drift:/m);
    expect(workflow).toContain('check-environments-drift.mjs');
    expect(workflow).toContain('sync-rulesets.mjs --check');
  });

  it('probes RELEASE_PLEASE_TOKEN expiry — fails on 401, warns when unset', () => {
    // A fine-grained PAT expires silently; an expired one degrades the release
    // path (merged Release PRs stop cutting tags). Probe it weekly so expiry is a
    // Monday ping, not a stuck release day.
    expect(workflow).toMatch(/^ {2}pat-canary:/m);
    expect(workflow).toContain('RELEASE_PLEASE_TOKEN not provisioned');
    expect(workflow).toContain('The PAT returned 401');
  });
});
