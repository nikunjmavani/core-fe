import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the single-command GitHub IaC surface: one flag-driven `github:sync`
// (no per-domain subcommands), so a future edit cannot quietly re-introduce the
// github:rulesets:* / github:environments:* / gh:rulesets:* / validate:github-env*
// scripts that were collapsed into it.
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
) as { scripts: Record<string, string> };
const scripts = packageJson.scripts;

const REMOVED = [
  'github:sync:check',
  'github:sync:dry-run',
  'github:rulesets:sync',
  'github:rulesets:sync:dry-run',
  'github:rulesets:check',
  'github:environments:check',
  'gh:rulesets:sync',
  'gh:rulesets:sync:dry-run',
  'gh:rulesets:check',
  'validate:github-env',
  'validate:github-environments',
];

describe('GitHub IaC scripts policy (single github:sync)', () => {
  it('exposes exactly one github: entry point — github:sync', () => {
    const githubScripts = Object.keys(scripts).filter((name) =>
      name.startsWith('github:'),
    );
    expect(githubScripts).toEqual(['github:sync']);
    expect(scripts['github:sync']).toBe('node tooling/setup/github/sync.mjs');
  });

  it('has no bare gh: scripts — all GitHub IaC lives under github:', () => {
    expect(Object.keys(scripts).filter((name) => name.startsWith('gh:'))).toEqual([]);
  });

  it('has removed every subcommand and legacy alias', () => {
    const resurrected = REMOVED.filter((name) => name in scripts);
    expect(resurrected).toEqual([]);
  });

  it('keeps the deploy-time secret validator as validate:deploy-env', () => {
    expect(scripts['validate:deploy-env']).toBe(
      'node tooling/setup/github/validate-github-env.mjs',
    );
  });
});
