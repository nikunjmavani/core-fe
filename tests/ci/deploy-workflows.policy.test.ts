import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the deploy-per-purpose workflows: an instant production rollback that
// restores (never rebuilds) behind the production reviewer gate.
const workflow = (name: string): string =>
  readFileSync(join(process.cwd(), '.github/workflows', name), 'utf8');

describe('deploy workflows policy', () => {
  it('rollback-deploy.yml is manual, production-gated, and restores without a rebuild', () => {
    const rollback = workflow('rollback-deploy.yml');
    expect(rollback).toContain('workflow_dispatch:');
    expect(rollback).toContain('environment: production');
    // Instant restore of an immutable deploy — NOT a rebuild.
    expect(rollback).toContain('restoreSiteDeploy');
    expect(rollback).not.toContain('pnpm build');
    expect(rollback).not.toMatch(/netlify\s+deploy\b/);
    // Shares the production concurrency group so it can't race a forward deploy.
    expect(rollback).toContain('group: netlify-deploy-production');
  });
});
