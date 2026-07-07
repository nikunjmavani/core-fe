import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const POST_MERGE_WORKFLOW = join(process.cwd(), '.github/workflows/post-merge-ci.yml');

// Locks the single-trunk post-merge wiring (delivery-model migration §12.2):
// one channel, ungated release-please, deploy split, and NO redundant re-testing
// of what pr-ci.yml already gated.
// Slice a top-level job block by name without a backtracking regex: from the
// `  <name>:` header to the next 2-space-indented job key.
function jobBlock(workflow: string, name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  if (start === -1) return '';
  const lines = workflow.slice(start + 1).split('\n');
  const out: string[] = [lines[0] ?? ''];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^ {2}\S/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

describe('post-merge CI policy (single trunk)', () => {
  const workflow = readFileSync(POST_MERGE_WORKFLOW, 'utf8');

  it('runs on pushes to main + release/** (plus manual dispatch), never dev', () => {
    expect(workflow).toContain('push:');
    expect(workflow).toContain("branches: [main, 'release/**']");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toMatch(/branches:\s*\[dev,\s*main\]/);
  });

  it('uses the single stable channel — no CHANNEL_SUFFIX, hardcoded config/manifest', () => {
    expect(workflow).not.toContain('CHANNEL_SUFFIX');
    expect(workflow).toContain('config-file: .github/release-please/config.json');
    expect(workflow).toContain('manifest-file: .github/release-please/manifest.json');
  });

  it('does NOT re-run the test suite post-merge (pr-ci is the gate)', () => {
    // The redundant unit/security/matrix jobs are gone; deploy no longer gates on them.
    expect(workflow).not.toMatch(/^ {2}unit-tests:/m);
    expect(workflow).not.toMatch(/^ {2}security-tests:/m);
    expect(workflow).not.toMatch(/^ {2}matrix-tests:/m);
    expect(workflow).not.toContain('reusable-vitest-unit-only.yml');
    expect(workflow).not.toContain('pnpm test:security');
  });

  it('runs release-please UNGATED — no environment selection on the job', () => {
    const releaseBlock = jobBlock(workflow, 'release-please');
    expect(releaseBlock).not.toBe('');
    const hasEnvironmentKey = releaseBlock
      .split('\n')
      .some((line) => /^ +environment:/.test(line));
    expect(hasEnvironmentKey).toBe(false);
  });

  it('runs release-please with the PAT (github.token fallback) so release-PR merges re-trigger it', () => {
    const tokenPattern =
      /\$\{\{\s*secrets\.RELEASE_PLEASE_TOKEN \|\| github\.token\s*\}\}/g;
    // action token + lint-fix GH_TOKEN + auto-merge GH_TOKEN.
    expect(workflow.match(tokenPattern)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('keeps the tripwire that warns when RELEASE_PLEASE_TOKEN is not provisioned', () => {
    expect(workflow).toContain('RELEASE_PLEASE_TOKEN not provisioned');
  });

  it('auto-merges release PRs with a merge commit, never squash (PR C flips this with the ruleset)', () => {
    expect(workflow).toMatch(
      /gh pr merge "\$\{pr_number\}" --auto --merge --delete-branch=false/,
    );
    expect(workflow).not.toMatch(/gh pr merge "\$\{pr_number\}" --auto --squash/);
  });

  it('reuses the SBOM artifact for release-sbom (no duplicate generation)', () => {
    expect(workflow).toMatch(/release-sbom:[\s\S]*?needs:\s*\[sbom,\s*release-please\]/);
    expect(workflow).toMatch(/release-sbom:[\s\S]*?name: sbom\.cyclonedx\.json/);
  });

  it('splits deploy: development alias on every main push, production only on a release', () => {
    // deploy-development — ungated, development environment, main only.
    const devBlock = jobBlock(workflow, 'deploy-development');
    expect(devBlock).not.toBe('');
    expect(devBlock).toContain('github_environment: development');
    expect(devBlock).toContain("github.ref_name == 'main'");

    // deploy-production — gated on releases_created, production environment.
    const prodBlock = jobBlock(workflow, 'deploy-production');
    expect(prodBlock).not.toBe('');
    expect(prodBlock).toContain('github_environment: production');
    expect(prodBlock).toContain(
      "needs.release-please.outputs.releases_created == 'true'",
    );
    expect(prodBlock).toContain("github.ref_name == 'main'");
  });

  it('no longer dispatches a post-release back-merge (single trunk — nothing to back-merge)', () => {
    expect(workflow).not.toContain('dispatch-post-release-backmerge');
    expect(workflow).not.toContain('post-release-backmerge.yml');
  });
});
