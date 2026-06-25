/**
 * Sync committed branch rulesets in `.github/rulesets/*.json` to GitHub via `gh`.
 * Plain-Node port of core-be's tooling/setup/github/rulesets.ts (this repo has no tsx).
 *
 * The committed JSON files are the source of truth. This script is idempotent:
 *   - If a ruleset with the same `name` does not exist on the repo, it is POSTed.
 *   - If one with the same `name` already exists, it is PUT (full replace).
 *
 * Modes:
 *   - default      : create-or-update each committed ruleset on the remote.
 *   - --check      : compare local files vs remote, report drift, exit non-zero on drift.
 *   - --dry-run    : show what would be created or updated without calling write APIs.
 *
 * Required status checks on protected branches:
 *   - "Quality gate" (PR CI aggregate)
 *   - "unit / Unit + global" (reusable unit gate — docs-only PRs pass via skip)
 *   - "Checks" (PR Governance)
 * Other lanes roll up into Quality gate; add ruleset entries only when a check
 * must be individually required (e.g. unit gate for docs-only PRs).
 *
 * Plan requirement (private repos): repository rulesets require GitHub Pro / Team /
 * Enterprise on private repos. On the free personal plan the API returns 403 with
 * "Upgrade to GitHub Pro or make this repository public to enable this feature."
 * The script surfaces that message verbatim and exits non-zero.
 *
 * Usage:
 *   pnpm gh:rulesets:sync
 *   pnpm gh:rulesets:sync:dry-run
 *   pnpm gh:rulesets:check
 */
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  GitHubApiError,
  getRepositoryIdentifier,
  runGhJson,
} from './github-shared.mjs';

const RULESETS_DIRECTORY = resolve(import.meta.dirname, '../../.github/rulesets');

function loadLocalRulesets(directory = RULESETS_DIRECTORY) {
  const entries = readdirSync(directory)
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  if (entries.length === 0) {
    throw new Error(`No ruleset files found in ${directory}.`);
  }

  return entries.map((fileName) => {
    const filePath = join(directory, fileName);
    const payload = JSON.parse(readFileSync(filePath, 'utf-8'));
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw new Error(`${fileName}: missing required string field "name".`);
    }
    return { fileName, filePath, payload, name };
  });
}

/** @param {string} repository */
function listRemoteRulesets(repository) {
  return runGhJson(['api', `repos/${repository}/rulesets`, '--paginate']);
}

function explainPlanBlocker(message) {
  if (!/Upgrade to GitHub Pro/i.test(message)) return message;
  return [
    message,
    '',
    'Hint: repository rulesets require GitHub Pro / Team / Enterprise on private repos.',
    'Either upgrade the account/org plan, or make the repository public.',
  ].join('\n');
}

/**
 * @param {{ repository: string, locals: ReturnType<typeof loadLocalRulesets>, mode: 'sync' | 'check' | 'dry-run' }} args
 */
function syncRulesets({ repository, locals, mode }) {
  let remote;
  try {
    remote = listRemoteRulesets(repository);
  } catch (listError) {
    const apiError =
      listError instanceof GitHubApiError
        ? listError
        : new GitHubApiError(null, String(listError));
    console.error(`Failed to list rulesets on ${repository}:`);
    console.error(explainPlanBlocker(apiError.message));
    return { failures: 1, drift: 0, listError: apiError };
  }

  const remoteByName = new Map(remote.map((entry) => [entry.name, entry]));
  let drift = 0;
  let failures = 0;

  for (const file of locals) {
    const existing = remoteByName.get(file.name);
    const label = `${file.fileName} (${file.name})`;

    if (mode === 'check') {
      if (existing) {
        console.log(`  ${label}: present on remote (id ${existing.id})`);
      } else {
        console.error(`  ${label}: missing on remote`);
        drift += 1;
      }
      continue;
    }

    if (mode === 'dry-run') {
      console.log(
        `  ${label}: would ${existing ? `PUT id ${existing.id}` : 'POST (create)'}`,
      );
      continue;
    }

    try {
      if (existing) {
        const updated = runGhJson(
          [
            'api',
            '--method',
            'PUT',
            '-H',
            'Accept: application/vnd.github+json',
            `repos/${repository}/rulesets/${existing.id}`,
            '--input',
            '-',
          ],
          { stdin: JSON.stringify(file.payload) },
        );
        console.log(`  ${label}: updated (id ${updated.id})`);
      } else {
        const created = runGhJson(
          [
            'api',
            '--method',
            'POST',
            '-H',
            'Accept: application/vnd.github+json',
            `repos/${repository}/rulesets`,
            '--input',
            '-',
          ],
          { stdin: JSON.stringify(file.payload) },
        );
        console.log(`  ${label}: created (id ${created.id})`);
      }
    } catch (writeError) {
      failures += 1;
      const apiError =
        writeError instanceof GitHubApiError
          ? writeError
          : new GitHubApiError(null, String(writeError));
      console.error(`  ${label}: FAILED`);
      console.error(explainPlanBlocker(apiError.message));
    }
  }

  return { failures, drift, listError: undefined };
}

function parseArguments() {
  const argumentsList = process.argv.slice(2);

  if (argumentsList.includes('--help') || argumentsList.includes('-h')) {
    console.log('Usage: pnpm gh:rulesets:sync [--check | --dry-run]');
    console.log('');
    console.log(
      '  (default)   Create-or-update each .github/rulesets/*.json on the repo',
    );
    console.log('  --check     Report drift between local files and remote rulesets');
    console.log('  --dry-run   Show what would be created or updated without writing');
    process.exit(0);
  }

  if (argumentsList.includes('--check')) return { mode: /** @type {const} */ ('check') };
  if (argumentsList.includes('--dry-run'))
    return { mode: /** @type {const} */ ('dry-run') };
  if (argumentsList.length === 0) return { mode: /** @type {const} */ ('sync') };

  throw new Error(
    `Unknown argument(s): ${argumentsList.join(' ')}. Use --help for options.`,
  );
}

function main() {
  const { mode } = parseArguments();

  if (mode !== 'dry-run') {
    try {
      execSync('gh auth status', { stdio: ['pipe', 'pipe', 'pipe'], timeout: 15_000 });
    } catch {
      console.error('gh is not authenticated. Run `gh auth login` first.');
      process.exit(1);
    }
  }

  const repository = getRepositoryIdentifier();
  const locals = loadLocalRulesets();

  console.log(`Repository:  ${repository}`);
  console.log(`Source dir:  ${RULESETS_DIRECTORY}`);
  console.log(`Local files: ${locals.map((file) => file.fileName).join(', ')}`);
  console.log(`Mode:        ${mode}`);
  console.log('');

  const result = syncRulesets({ repository, locals, mode });
  console.log('');

  if (mode === 'check') {
    if (result.drift === 0 && !result.listError) {
      console.log('Rulesets in sync: every local file is present on remote.');
      return;
    }
    if (!result.listError) {
      console.error(
        `Drift detected: ${result.drift} local ruleset(s) missing on remote.`,
      );
      console.error('Run `pnpm gh:rulesets:sync` to apply them.');
    }
    process.exit(1);
  }

  if (mode === 'dry-run') {
    if (result.listError) process.exit(1);
    console.log('Dry run complete. No changes pushed.');
    return;
  }

  if (result.failures > 0) {
    console.error(`Sync finished with ${result.failures} failure(s).`);
    process.exit(1);
  }
  console.log('Sync complete.');
}

main();
