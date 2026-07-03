import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const POST_MERGE_WORKFLOW = join(process.cwd(), '.github/workflows/post-merge-ci.yml');

// Locks the release-please wiring ported from core-be (their #698/#720/#835
// retrospectives — each assertion here maps to a failure that shipped there).
describe('post-merge CI policy', () => {
  const workflow = readFileSync(POST_MERGE_WORKFLOW, 'utf8');

  it('runs only on pushes to dev/main (plus manual dispatch)', () => {
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [dev, main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
  });

  it('selects the release channel by branch via CHANNEL_SUFFIX (dev → .dev prerelease, main → stable)', () => {
    expect(workflow).toMatch(
      /CHANNEL_SUFFIX:.*github\.ref_name == 'dev' && '\.dev' \|\| ''/,
    );
    expect(workflow).toContain(
      'config-file: .github/release-please/config${{ env.CHANNEL_SUFFIX }}.json',
    );
    expect(workflow).toContain(
      'manifest-file: .github/release-please/manifest${{ env.CHANNEL_SUFFIX }}.json',
    );
  });

  it('gates release-please on the post-merge test matrix', () => {
    expect(workflow).toMatch(/release-please:[\s\S]*?needs:\s*\[matrix-tests\]/);
    expect(workflow).toMatch(
      /release-please:[\s\S]*?needs\.matrix-tests\.result == 'success' \|\| needs\.matrix-tests\.result == 'skipped'/,
    );
  });

  it('runs release-please with the PAT (falling back to github.token) so release-PR merges re-trigger this workflow', () => {
    const tokenPattern =
      /\$\{\{\s*secrets\.RELEASE_PLEASE_TOKEN \|\| github\.token\s*\}\}/g;
    // release-please action token + lint-fix GH_TOKEN + auto-merge GH_TOKEN.
    expect(workflow.match(tokenPattern)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('keeps the tripwire that warns when RELEASE_PLEASE_TOKEN is not provisioned', () => {
    expect(workflow).toContain('RELEASE_PLEASE_TOKEN not provisioned');
  });

  it('auto-merges release PRs with a merge commit, never squash (squash would break main ⊆ dev ancestry)', () => {
    expect(workflow).toMatch(
      /gh pr merge "\$\{pr_number\}" --auto --merge --delete-branch=false/,
    );
    expect(workflow).not.toMatch(/gh pr merge "\$\{pr_number\}" --auto --squash/);
  });

  it('reuses the SBOM artifact for release-sbom (no duplicate generation)', () => {
    expect(workflow).toMatch(/release-sbom:[\s\S]*?needs:\s*\[sbom,\s*release-please\]/);
    expect(workflow).toMatch(/release-sbom:[\s\S]*?name: sbom\.cyclonedx\.json/);
  });

  it('deploys via the Netlify reusable with an explicit GitHub Environment input (no event-name-based resolution)', () => {
    expect(workflow).toMatch(/deploy:[\s\S]*?reusable-netlify-deploy\.yml/);
    expect(workflow).toMatch(
      /deploy:[\s\S]*?github_environment:.*github\.ref_name == 'dev' && 'development' \|\| 'production'/,
    );
  });

  it('dispatches the post-release back-merge only on main, after a successful deploy and a created release', () => {
    const dispatchBlock =
      workflow.match(/^ {2}dispatch-post-release-backmerge:\n([\s\S]*?)\n {2}\S/m)?.[1] ??
      '';
    expect(dispatchBlock).not.toBe('');
    expect(dispatchBlock).toContain("github.ref_name == 'main'");
    expect(dispatchBlock).toContain(
      "needs.release-please.outputs.releases_created == 'true'",
    );
    expect(dispatchBlock).toContain("needs.deploy.result == 'success'");
  });
});
