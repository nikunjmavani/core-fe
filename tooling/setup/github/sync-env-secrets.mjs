/**
 * Push deploy secrets from local `.env.<environment>` to GitHub.
 *
 * Usage:
 *   node tooling/setup/github/sync-env-secrets.mjs development
 *   node tooling/setup/github/sync-env-secrets.mjs --all
 *   node tooling/setup/github/sync-env-secrets.mjs production --dry-run
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listGitHubEnvironmentSecretNames, requireGhAuth } from './github-shared.mjs';
import { parseEnvFile } from './parse-env-file.mjs';
import { getConfiguredEnvironmentNames, getEnvironmentConfig } from './setup-config.mjs';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../..');

/**
 * @param {string} environmentName
 */
export function loadLocalDeploySecrets(environmentName) {
  const environment = getEnvironmentConfig(environmentName);
  const allowed = new Set(environment.deploySecrets ?? []);

  const envFilePath = resolve(PROJECT_ROOT, `.env.${environmentName}`);
  const sourceEntries = parseEnvFile(envFilePath);

  /** @type {Map<string, string>} */
  const filtered = new Map();
  for (const [key, value] of sourceEntries) {
    if (!allowed.has(key)) continue;
    if (!value.trim()) continue;
    filtered.set(key, value);
  }
  return filtered;
}

/**
 * @param {string} environment
 * @param {string} name
 * @param {string} value
 */
function setGitHubSecret(environment, name, value) {
  execFileSync('gh', ['secret', 'set', name, '--env', environment], {
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30_000,
  });
}

/**
 * @param {string} environmentName
 * @param {'sync' | 'check' | 'dry-run'} mode
 */
export function syncEnvironmentSecrets(environmentName, mode) {
  const secrets = loadLocalDeploySecrets(environmentName);
  const environment = getEnvironmentConfig(environmentName);
  const allowed = environment.deploySecrets ?? [];

  console.log(`Environment: ${environmentName}`);
  console.log(`Source:      .env.${environmentName}`);
  console.log(`Local keys:  ${secrets.size} non-empty / ${allowed.length} configured`);
  console.log('');

  if (mode === 'check') {
    const remote = new Set(listGitHubEnvironmentSecretNames(environmentName));
    let drift = 0;
    for (const name of allowed) {
      const localValue = secrets.get(name);
      const remotePresent = remote.has(name);
      if (localValue && !remotePresent) {
        console.error(`  ${name}: in local file but missing on GitHub`);
        drift += 1;
      } else if (localValue && remotePresent) {
        console.log(`  ${name}: present`);
      } else if (!localValue && remotePresent) {
        console.log(`  ${name}: on GitHub (local empty — not reconciled in check mode)`);
      } else {
        console.log(`  ${name}: empty locally`);
      }
    }
    return { drift, failures: 0, pushed: 0 };
  }

  let pushed = 0;
  let failures = 0;

  for (const [name, value] of secrets) {
    if (mode === 'dry-run') {
      console.log(`  would set secret ${name}`);
      pushed += 1;
      continue;
    }

    try {
      setGitHubSecret(environmentName, name, value);
      console.log(`  set ${name}`);
      pushed += 1;
    } catch (setError) {
      failures += 1;
      console.error(
        `  ${name}: FAILED — ${setError instanceof Error ? setError.message : String(setError)}`,
      );
    }
  }

  return { drift: 0, failures, pushed };
}

function parseArguments() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.includes('--help') || argumentsList.includes('-h')) {
    console.log(
      'Usage: node tooling/setup/github/sync-env-secrets.mjs [environment...] [--all] [--check | --dry-run]',
    );
    process.exit(0);
  }

  const mode = argumentsList.includes('--check')
    ? 'check'
    : argumentsList.includes('--dry-run')
      ? 'dry-run'
      : 'sync';

  const all = argumentsList.includes('--all');
  const environments = argumentsList.filter(
    (argument) => !argument.startsWith('--') && /^[a-z][a-z0-9-]*$/.test(argument),
  );

  /** @type {string[]} */
  let selected = environments;
  if (all || selected.length === 0) {
    selected = getConfiguredEnvironmentNames();
  }

  return { mode, environments: selected };
}

function main() {
  const { mode, environments } = parseArguments();
  if (mode !== 'dry-run') {
    requireGhAuth();
  }

  let totalDrift = 0;
  let totalFailures = 0;

  for (const environmentName of environments) {
    const result = syncEnvironmentSecrets(environmentName, mode);
    totalDrift += result.drift;
    totalFailures += result.failures;
    console.log('');
  }

  if (mode === 'check' && totalDrift > 0) {
    console.error(
      `Secret drift: ${totalDrift} key(s) in local file but missing on GitHub.`,
    );
    console.error('Run `pnpm github:sync` to push them.');
    process.exit(1);
  }

  if (totalFailures > 0) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
