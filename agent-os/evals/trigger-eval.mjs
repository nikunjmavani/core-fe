#!/usr/bin/env node
/**
 * agent-os trigger evals — Tier 2 (core-fe).
 *
 * Usage:
 *   node agent-os/evals/trigger-eval.mjs
 *   node agent-os/evals/trigger-eval.mjs --strict
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = process.cwd();
const strict = process.argv.includes('--strict');

const skillNames = new Set(
  readdirSync(join(repositoryRoot, 'agent-os', 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name),
);

/** @param {string} glob */
function globToRegExp(glob) {
  let token = glob
    .trim()
    .replace(/\*\*/g, '\u0000GLOBSTAR\u0000')
    .replace(/\*/g, '\u0000STAR\u0000');
  token = token.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  token = token.replace(/\u0000GLOBSTAR\u0000/g, '.*').replace(/\u0000STAR\u0000/g, '[^/]*');
  if (!glob.includes('/')) return new RegExp(`${token}$`);
  return new RegExp(`^${token}$`);
}

/** @typedef {{ globs: RegExp[]; skills: string[] }} TriggerRow */

/** @param {string} markdown */
function parseTriggerRows(markdown) {
  const filePatternSection = markdown.split('## By file pattern')[1]?.split('## ')[0] ?? markdown;
  /** @type {TriggerRow[]} */
  const rows = [];
  for (const line of filePatternSection.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const patternCell = cells[1] ?? '';
    const skillsCell = cells[2] ?? '';
    if (!patternCell || /file pattern/i.test(patternCell) || /^-+$/.test(patternCell)) continue;
    const globs = [...patternCell.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1].trim())
      .filter((token) => token.includes('/') || token.includes('*') || token.includes('.'));
    if (!globs.length) continue;
    const skills = [...skillsCell.matchAll(/`([a-z][a-z0-9-]+)`/g)]
      .map((match) => match[1])
      .filter((token) => skillNames.has(token));
    if (!skills.length) {
      const fallback = [...skillsCell.matchAll(/\b([a-z][a-z0-9-]+)\b/g)]
        .map((match) => match[1])
        .filter((token) => skillNames.has(token));
      rows.push({ globs: globs.map(globToRegExp), skills: fallback });
    } else {
      rows.push({ globs: globs.map(globToRegExp), skills });
    }
  }
  return rows;
}

const rows = parseTriggerRows(
  readFileSync(join(repositoryRoot, 'agent-os', 'docs', 'skill-triggers.md'), 'utf8'),
);
const cases = JSON.parse(
  readFileSync(join(repositoryRoot, 'agent-os', 'evals', 'cases', 'triggers.json'), 'utf8'),
).cases;

console.log('\nagent-os trigger evals (Tier 2 — core-fe)\n');

let unmet = 0;
for (const testCase of cases) {
  const matchedRows = rows.filter((row) => row.globs.some((pattern) => pattern.test(testCase.file)));
  const resolved = new Set(matchedRows.flatMap((row) => row.skills));
  const missing = testCase.expectSkills.filter((skill) => !resolved.has(skill));
  if (missing.length === 0) {
    console.log(`  ✓ ${testCase.file}`);
  } else {
    unmet += missing.length;
    console.log(`  ✗ ${testCase.file}`);
    console.log(`      trigger map does not surface: ${missing.join(', ')}`);
    if (testCase.why) console.log(`      expected because: ${testCase.why}`);
  }
}

console.log('');
if (unmet === 0) {
  console.log(`✓ ${cases.length}/${cases.length} cases route correctly\n`);
} else {
  console.log(
    `${strict ? '✗' : '⚠'} ${unmet} expected route(s) not surfaced across ${cases.length} cases\n`,
  );
  if (strict) process.exit(1);
}
