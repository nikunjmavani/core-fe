import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Locks the single-aggregate merge gate: branch protection requires exactly
// { "Quality gate", "Checks" }, and the `quality-gate` job in pr-ci.yml `needs:`
// every merge-gating lane. Adding a lane => edit quality-gate.needs only, never
// the ruleset; a lane dropped from needs (silently un-gating it) fails here.
const ruleset = JSON.parse(
  readFileSync(join(process.cwd(), '.github/rulesets/main.json'), 'utf8'),
) as {
  rules: Array<{
    type: string;
    parameters?: { required_status_checks?: Array<{ context: string }> };
  }>;
};
const prCi = readFileSync(join(process.cwd(), '.github/workflows/pr-ci.yml'), 'utf8');

function requiredContexts(): string[] {
  const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
  return (rule?.parameters?.required_status_checks ?? [])
    .map((check) => check.context)
    .sort();
}

// Line-based extract of the `quality-gate` job's `needs: [ ... ]` list (no
// backtracking regex — mirrors the other ci-policy parsers).
function qualityGateNeeds(): string[] {
  const lines = prCi.split('\n');
  const start = lines.findIndex((line) => line.startsWith('  quality-gate:'));
  const needs: string[] = [];
  let inNeeds = false;
  for (let i = start + 1; i < lines.length; i++) {
    const trimmed = (lines[i] ?? '').trim();
    if (!inNeeds && trimmed.startsWith('needs:')) {
      inNeeds = true;
      continue;
    }
    if (inNeeds) {
      if (trimmed.includes(']')) break;
      const name = trimmed.replace(/[[\],]/g, '').trim();
      if (name) needs.push(name);
    }
  }
  return needs;
}

// Every lane whose failure must block merge (the plumbing `changes` job aside).
const MERGE_GATING_LANES = [
  'agent-os-gate',
  'biome',
  'lint',
  'knip',
  'format',
  'typecheck',
  'static-sync',
  'unit',
  'security-tests',
  'build-verify',
  'security-audit',
  'security-secrets',
  'security-sast',
  'security-iac',
  'dependency-review',
  'actionlint',
];

describe('quality-gate aggregate policy', () => {
  it('branch protection requires exactly { Quality gate, Checks } — no per-lane contexts', () => {
    expect(requiredContexts()).toEqual(['Checks', 'Quality gate']);
  });

  it('no individual lane (e.g. the unit gate) is a separately-required context', () => {
    expect(requiredContexts()).not.toContain('unit / Unit + global');
  });

  it('quality-gate.needs covers every merge-gating lane', () => {
    const needs = new Set(qualityGateNeeds());
    const missing = MERGE_GATING_LANES.filter((lane) => !needs.has(lane));
    expect(missing).toEqual([]);
  });
});
