/**
 * Unified GitHub IaC sync — rulesets, environment shells, protection drift, deploy secrets.
 *
 * Order:
 *   1. Scaffold missing `.env.<environment>` files (sync mode only)
 *   2. Sync branch rulesets (`.github/rulesets/*.json`)
 *   3. Ensure GitHub Environment shells exist
 *   4. Reconcile deploy secrets from `.env.<environment>` (sync mode only)
 *
 * Modes:
 *   default    — scaffold + rulesets + environments + secrets push
 *   --check    — read-only drift (rulesets, env shells, protection, secret names)
 *   --dry-run  — preview without writes
 *   --yes      — skip secrets push confirmation
 *   --from-config-setup — read secrets from config.setup.env instead of .env.*
 *
 * Usage:
 *   pnpm github:sync
 *   pnpm github:sync --check
 *   pnpm github:sync --dry-run
 *   pnpm github:sync production --yes
 */
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { validateGitHubEnvironmentsDrift } from './check-environments-drift.mjs';
import { driftResultsHaveIssues } from './environments-util.mjs';
import { requireGhAuth } from './github-shared.mjs';
import { scaffoldGithubEnvFiles } from './scaffold-env-files.mjs';
import { getConfiguredEnvironmentNames } from './setup-config.mjs';
import { ensureGitHubEnvironments } from './sync-environments.mjs';
import { syncEnvironmentSecrets } from './sync-env-secrets.mjs';

/**
 * @param {string} scriptName
 * @param {string[]} args
 */
function runNodeScript(scriptName, args) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(scriptName, import.meta.url)), ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

function parseArguments() {
  const argumentsList = process.argv.slice(2);

  if (argumentsList.includes('--help') || argumentsList.includes('-h')) {
    console.log('Usage: pnpm github:sync [environment...] [--check | --dry-run] [--yes] [--from-config-setup]');
    console.log('');
    console.log('  (default)   All environments: scaffold + rulesets + env shells + secrets');
    console.log('  --check     Read-only drift checks (no writes)');
    console.log('  --dry-run   Preview remote changes (no writes)');
    console.log('  --yes       Skip secrets push confirmation');
    console.log('  --from-config-setup  Read secrets from config.setup.env (legacy path)');
    process.exit(0);
  }

  if (argumentsList.includes('--check') && argumentsList.includes('--dry-run')) {
    throw new Error('Use either --check or --dry-run, not both.');
  }

  const mode = argumentsList.includes('--check')
    ? 'check'
    : argumentsList.includes('--dry-run')
      ? 'dry-run'
      : 'sync';

  const fromConfigSetup = argumentsList.includes('--from-config-setup');
  const skipConfirmation = argumentsList.includes('--yes') || argumentsList.includes('-y');
  const environments = argumentsList.filter(
    (argument) => !argument.startsWith('--') && /^[a-z][a-z0-9-]*$/.test(argument),
  );

  /** @type {string[]} */
  let selectedEnvironments = environments;
  if (selectedEnvironments.length === 0) {
    selectedEnvironments = getConfiguredEnvironmentNames();
  }

  return { mode, fromConfigSetup, skipConfirmation, environments: selectedEnvironments };
}

/**
 * @param {string} mode
 */
function syncRulesets(mode) {
  const args =
    mode === 'check' ? ['--check'] : mode === 'dry-run' ? ['--dry-run'] : [];
  return runNodeScript('./sync-rulesets.mjs', args);
}

async function confirmSecretsPush() {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await readline.question('Push deploy secrets to GitHub Environments? [y/N] ');
  readline.close();
  return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
}

async function main() {
  const { mode, fromConfigSetup, skipConfirmation, environments } = parseArguments();

  if (mode !== 'dry-run') {
    requireGhAuth();
  }

  console.log(`GitHub sync — mode: ${mode}`);
  console.log(`Environments: ${environments.join(', ')}`);
  console.log('');

  if (mode === 'sync') {
    console.log('Step 1/4 — Scaffold local .env.<environment> files');
    scaffoldGithubEnvFiles({ dryRun: false });
    console.log('');
  }

  console.log(`Step ${mode === 'sync' ? '2' : '1'}/4 — Branch rulesets`);
  const rulesetStatus = syncRulesets(mode);
  if (rulesetStatus !== 0) {
    process.exit(rulesetStatus);
  }
  console.log('');

  console.log(`Step ${mode === 'sync' ? '3' : '2'}/4 — GitHub Environment shells`);
  const environmentResult = ensureGitHubEnvironments(mode);
  if (mode === 'check' && environmentResult.drift > 0) {
    process.exit(1);
  }
  if (environmentResult.failures > 0) {
    process.exit(1);
  }
  console.log('');

  if (mode === 'check') {
    const protectionResults = validateGitHubEnvironmentsDrift();
    if (driftResultsHaveIssues(protectionResults)) {
      process.exit(1);
    }
  } else if (mode === 'dry-run') {
    console.log('  (protection drift check skipped in dry-run — use --check)');
  } else {
    const protectionResults = validateGitHubEnvironmentsDrift();
    if (driftResultsHaveIssues(protectionResults)) {
      console.warn(
        'Protection drift detected — update GitHub UI to match .github/environments/*.json.',
      );
      console.warn('Secrets will still be pushed; protection must be applied manually in GitHub.');
    }
  }
  console.log('');

  console.log(`Deploy secrets`);
  if (mode === 'check') {
    let totalDrift = 0;
    for (const environmentName of environments) {
      const result = syncEnvironmentSecrets(environmentName, 'check', { fromConfigSetup });
      totalDrift += result.drift;
    }
    if (totalDrift > 0) {
      process.exit(1);
    }
    console.log('GitHub sync check: OK.');
    return;
  }

  if (mode === 'dry-run') {
    for (const environmentName of environments) {
      syncEnvironmentSecrets(environmentName, 'dry-run', { fromConfigSetup });
    }
    console.log('Dry run complete. No changes pushed.');
    return;
  }

  if (!skipConfirmation) {
    const confirmed = await confirmSecretsPush();
    if (!confirmed) {
      console.log('Secrets push skipped.');
      return;
    }
  }

  let failures = 0;
  for (const environmentName of environments) {
    const result = syncEnvironmentSecrets(environmentName, 'sync', { fromConfigSetup });
    failures += result.failures;
  }

  if (failures > 0) {
    process.exit(1);
  }

  console.log('');
  console.log('GitHub sync complete.');
  console.log('Verify: pnpm validate:github-env');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
