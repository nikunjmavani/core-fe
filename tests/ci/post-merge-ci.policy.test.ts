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
    // action token + lint-fix GH_TOKEN (no auto-merge step — release on cadence).
    expect(workflow.match(tokenPattern)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('keeps the tripwire that warns when RELEASE_PLEASE_TOKEN is not provisioned', () => {
    expect(workflow).toContain('RELEASE_PLEASE_TOKEN not provisioned');
  });

  it('does NOT auto-merge release PRs — release on cadence (manual merge is the ship button)', () => {
    // release-please keeps the standing Release PR fresh; a human merges it to ship.
    expect(workflow).not.toMatch(/gh pr merge[^\n]*--auto/);
    expect(workflow).not.toContain('Enable auto-merge on release PRs');
  });

  it('generates the SBOM ONLY when a release is cut (not on every merge)', () => {
    const sbomBlock = jobBlock(workflow, 'sbom');
    expect(sbomBlock).not.toBe('');
    expect(sbomBlock).toContain('needs: [release-please]');
    expect(sbomBlock).toContain(
      "needs.release-please.outputs.releases_created == 'true'",
    );
    // release-sbom still reuses that artifact (no duplicate generation).
    const releaseSbomBlock = jobBlock(workflow, 'release-sbom');
    expect(releaseSbomBlock).toContain('needs: [sbom, release-please]');
    expect(releaseSbomBlock).toContain('name: sbom.cyclonedx.json');
  });

  it('deploy-development is decoupled from release-please and batched (cancel-in-progress)', () => {
    const devBlock = jobBlock(workflow, 'deploy-development');
    expect(devBlock).not.toBe('');
    // decoupled: depends on `changes`, NOT release-please (development alias tracks
    // HEAD even on a release failure).
    expect(devBlock).toContain('needs: [changes]');
    expect(devBlock).not.toContain('needs.release-please');
    expect(devBlock).not.toMatch(/needs:\s*\[[^\]]*release-please/);
    // batched: rapid merges collapse to one deploy.
    expect(devBlock).toContain('cancel-in-progress: true');
    expect(devBlock).toContain('github_environment: development');
    expect(devBlock).toContain(
      'github.ref_name == github.event.repository.default_branch',
    );
    expect(devBlock).toContain("needs.changes.outputs.src-code == 'true'");
  });

  it('deploy-production is release-gated and never cancelled', () => {
    const prodBlock = jobBlock(workflow, 'deploy-production');
    expect(prodBlock).not.toBe('');
    expect(prodBlock).toContain('github_environment: production');
    expect(prodBlock).toContain(
      "needs.release-please.outputs.releases_created == 'true'",
    );
    expect(prodBlock).toContain(
      'github.ref_name == github.event.repository.default_branch',
    );
    expect(prodBlock).toContain('cancel-in-progress: false');
  });

  it('no longer dispatches a post-release back-merge (single trunk — nothing to back-merge)', () => {
    expect(workflow).not.toContain('dispatch-post-release-backmerge');
    expect(workflow).not.toContain('post-release-backmerge.yml');
  });
});
