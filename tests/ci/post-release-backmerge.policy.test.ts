import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const BACKMERGE_WORKFLOW = join(
  process.cwd(),
  '.github/workflows/post-release-backmerge.yml',
);

// Ported from core-be src/tests/unit/ci/post-release-backmerge.policy.unit.test.ts
// (the workflow file itself is byte-identical between the repos).
describe('post-release back-merge workflow policy', () => {
  const workflow = readFileSync(BACKMERGE_WORKFLOW, 'utf8');

  it('triggers on release.published and on manual workflow_dispatch only', () => {
    expect(workflow).toContain('release:');
    expect(workflow).toContain('types: [published]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    // A push trigger would be a 2-space-indented `push:` key under `on:`.
    expect(workflow).not.toMatch(/^ {2}push:$/m);
  });

  it('filters out prerelease events so dev `-dev.N` tags do not fire it', () => {
    expect(workflow).toContain('github.event.release.prerelease == false');
    expect(workflow).toContain("!contains(github.event.release.tag_name, '-dev.')");
  });

  it('uses the built-in github.token with minimal write permissions', () => {
    expect(workflow).toMatch(/permissions:[\s\S]*?contents:\s*write/);
    expect(workflow).toMatch(/permissions:[\s\S]*?pull-requests:\s*write/);
    expect(workflow).not.toMatch(/permissions:[\s\S]*?packages:\s*write/);
    expect(workflow).not.toMatch(/permissions:[\s\S]*?id-token:\s*write/);
    expect(workflow).toMatch(/token:\s*\$\{\{\s*github\.token\s*\}\}/);
    expect(workflow).toMatch(/GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  });

  it('only edits the dev release seed files (no stable release files or sources touched)', () => {
    const gitAddLines = workflow
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('git add '));
    expect(gitAddLines.length).toBeGreaterThan(0);
    expect(workflow).toMatch(/git add .*manifest\.dev\.json.*package\.json/);
    for (const line of gitAddLines) {
      const files = line
        .split(' ')
        .slice(2)
        .filter((token) => token !== '' && !token.startsWith('-'));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(file, `unexpected file added by back-merge workflow: ${file}`).toMatch(
          /(?:manifest\.dev\.json|package\.json)$/,
        );
      }
    }
  });

  it('checks out dev, merges main, and pushes a branch named release/backmerge-v<version>', () => {
    expect(workflow).toMatch(/ref:\s*dev/);
    expect(workflow).toContain('git fetch origin main');
    expect(workflow).toMatch(/git merge[^\n]*origin\/main/);
    expect(workflow).toMatch(/branch="release\/backmerge-v\$\{VERSION\}"/);
  });

  it('opens a PR to dev and enables auto-merge with a merge commit (idempotent)', () => {
    expect(workflow).toMatch(/gh pr create[\s\S]*?--base dev/);
    expect(workflow).toMatch(/gh pr merge[^\n]*--auto[^\n]*--merge/);
    expect(workflow).not.toMatch(/gh pr merge[^\n]*--auto[^\n]*--squash/);
  });

  it('declares concurrency so simultaneous release events queue instead of racing', () => {
    expect(workflow).toContain('concurrency:');
    expect(workflow).toContain('group: post-release-backmerge-');
    expect(workflow).toContain('cancel-in-progress: false');
  });
});
