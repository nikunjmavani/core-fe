#!/usr/bin/env node
/**
 * agent-os integrity evals — Tier 1 (core-fe).
 *
 * Usage:
 *   node agent-os/evals/check.mjs            # gate
 *   node agent-os/evals/check.mjs --report   # verbose
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const repositoryRoot = process.cwd();
const agentOsDirectory = join(repositoryRoot, 'agent-os');
const reportMode = process.argv.includes('--report');

/** @typedef {{ level: 'error' | 'warn'; check: string; message: string }} Finding */

/** @type {Finding[]} */
const findings = [];
const error = (check, message) => findings.push({ level: 'error', check, message });
const warn = (check, message) => findings.push({ level: 'warn', check, message });

const readText = (absolutePath) => readFileSync(absolutePath, 'utf8');

const listSkillDirectoryNames = (absoluteDirectory) =>
  readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();

const listFilesWithExtension = (absoluteDirectory, extension) =>
  readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name)
    .sort();

/** @param {string} text @param {string} key */
function frontmatterField(text, key) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!block) return undefined;
  const lines = block.split('\n');
  const index = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  if (index === -1) return undefined;
  const inline = lines[index].slice(key.length + 1).trim();
  if (inline !== '' && !['>', '|', '>-', '|-'].includes(inline)) return inline;
  const collected = [];
  for (let cursor = index + 1; cursor < lines.length; cursor++) {
    if (/^\s+\S/.test(lines[cursor])) collected.push(lines[cursor].trim());
    else if (/^\s*$/.test(lines[cursor])) continue;
    else break;
  }
  return collected.join(' ').trim() || undefined;
}

/** @param {string} text @param {RegExp} pattern */
function allNumbers(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => Number(match[1]));
}

const skillDirectoryNames = listSkillDirectoryNames(join(agentOsDirectory, 'skills'));
/** @type {string[]} */
const skillsWithManifest = [];

for (const skill of skillDirectoryNames) {
  const skillFile = join(agentOsDirectory, 'skills', skill, 'SKILL.md');
  if (!existsSync(skillFile)) {
    warn('skill-stub', `skills/${skill}/ has no SKILL.md (stub directory — add SKILL.md or remove)`);
    continue;
  }
  skillsWithManifest.push(skill);
  const text = readText(skillFile);
  const name = frontmatterField(text, 'name');
  const description = frontmatterField(text, 'description');
  if (!name) error('skill-frontmatter', `skills/${skill}/SKILL.md missing frontmatter \`name\``);
  else if (name !== skill)
    warn(
      'skill-frontmatter',
      `skills/${skill}/SKILL.md name "${name}" != directory "${skill}" (vendored skill — OK if intentional)`,
    );
  if (!description)
    error('skill-frontmatter', `skills/${skill}/SKILL.md missing frontmatter \`description\``);
  else if (description.length < 80)
    warn(
      'skill-description',
      `skills/${skill}: description is ${description.length} chars — thin for auto-trigger`,
    );
}

const registryFile = join(agentOsDirectory, 'skills', 'skill-registry', 'SKILL.md');
if (existsSync(registryFile)) {
  const registryText = readText(registryFile);
  const registryPaths = new Set(
    [...registryText.matchAll(/\*\*Path:\*\*\s+`([^`]+)`/g)].map((match) => match[1].trim()),
  );
  for (const path of registryPaths) {
    if (!existsSync(join(repositoryRoot, path)))
      error('skill-registry-path', `skill-registry Path \`${path}\` does not exist`);
  }
  for (const skill of skillsWithManifest) {
    const expected = `agent-os/skills/${skill}/SKILL.md`;
    if (!registryText.includes(expected))
      warn('skill-registry-coverage', `skill "${skill}" is not referenced in skill-registry inventory`);
  }
  for (const count of new Set(allNumbers(registryText, /(\d+)\+?\s+project skills/g)))
    if (count !== skillsWithManifest.length)
      error(
        'skill-registry-count',
        `skill-registry states ${count} project skills; ${skillsWithManifest.length} SKILL.md files exist`,
      );
}

const agentFiles = listFilesWithExtension(join(agentOsDirectory, 'agents'), '.md').filter(
  (file) => file !== 'README.md',
);
for (const file of agentFiles) {
  const text = readText(join(agentOsDirectory, 'agents', file));
  const agentName = basename(file, '.md');
  const name = frontmatterField(text, 'name');
  const description = frontmatterField(text, 'description');
  if (!name || name !== agentName)
    error('agent-frontmatter', `agents/${file} name "${name ?? '∅'}" != "${agentName}"`);
  if (!description) error('agent-frontmatter', `agents/${file} missing frontmatter \`description\``);
}

const settingsFile = join(agentOsDirectory, 'platforms', 'claude', 'settings.json');
if (existsSync(settingsFile)) {
  let settings = null;
  try {
    settings = JSON.parse(readText(settingsFile));
  } catch {
    error('hook-portability', 'agent-os/platforms/claude/settings.json is not valid JSON');
  }
  const commands = Object.values(settings?.hooks ?? {})
    .flat()
    .flatMap((entry) => entry.hooks ?? [])
    .map((hook) => hook.command)
    .filter((command) => typeof command === 'string');
  for (const command of commands) {
    if (/\/Users\/|\/home\/|\/root\//.test(command))
      error(
        'hook-portability',
        `settings.json hook hardcodes an absolute home path — use "$CLAUDE_PROJECT_DIR": ${command}`,
      );
    const scriptReference = command.match(/agent-os\/hooks\/[A-Za-z0-9._-]+\.(sh|mjs)/)?.[0];
    if (scriptReference && !existsSync(join(repositoryRoot, scriptReference)))
      error('hook-script', `settings.json references hook script ${scriptReference} which does not exist`);
  }
}

const ignoreFile = join(agentOsDirectory, 'evals', 'ignore.json');
const ignored = existsSync(ignoreFile) ? JSON.parse(readText(ignoreFile)).paths ?? [] : [];
const pathRoots = [
  'src/',
  'scripts/',
  'agent-os/',
  'docs/',
  'tests/',
  '.github/',
  '.husky/',
  'plugins/',
  'public/',
];
const pathExtensions = ['.ts', '.tsx', '.mjs', '.json', '.md', '.mdc', '.yml', '.yaml', '.sh', '.txt', '.html'];

/** @param {string} token */
const isPathCandidate = (token) => {
  if (/[*<>:{}\s]|\.\.|^https?/.test(token)) return false;
  if (ignored.some((entry) => token === entry || token.startsWith(entry))) return false;
  const underRoot = pathRoots.some((root) => token.startsWith(root));
  const hasKnownExtension = pathExtensions.some((extension) => token.endsWith(extension));
  return underRoot && hasKnownExtension;
};

/** @param {string} absolutePath */
const scanOneFile = (absolutePath) => {
  const displayPath = relative(repositoryRoot, absolutePath);
  const text = readText(absolutePath);
  const seen = new Set();
  for (const inline of text.matchAll(/`([^`\n]+)`/g)) {
    const token = inline[1].trim();
    if (seen.has(token) || !isPathCandidate(token)) continue;
    seen.add(token);
    if (!existsSync(join(repositoryRoot, token)))
      error(
        'referenced-path',
        `${displayPath} → \`${token}\` does not exist (fix ref or add to evals/ignore.json)`,
      );
  }
};

/** @param {string} absoluteDirectory @param {string} extension */
const scanForPaths = (absoluteDirectory, extension) => {
  for (const file of listFilesWithExtension(absoluteDirectory, extension))
    scanOneFile(join(absoluteDirectory, file));
};

scanForPaths(join(agentOsDirectory, 'docs'), '.md');
scanForPaths(join(agentOsDirectory, 'rules'), '.mdc');
for (const skill of skillsWithManifest) scanForPaths(join(agentOsDirectory, 'skills', skill), '.md');
for (const rootDoc of ['CLAUDE.md', 'AGENTS.md'])
  if (existsSync(join(repositoryRoot, rootDoc))) scanOneFile(join(repositoryRoot, rootDoc));

const hooksManifestFile = join(agentOsDirectory, 'hooks', 'hooks.json');
if (existsSync(hooksManifestFile)) {
  try {
    const manifest = JSON.parse(readText(hooksManifestFile));
    for (const entry of manifest.hooks ?? []) {
      if (!entry.script) error('hooks-manifest', `hooks.json entry "${entry.id ?? '∅'}" has no script`);
      else if (!existsSync(join(agentOsDirectory, 'hooks', entry.script)))
        error('hooks-manifest', `hooks.json references agent-os/hooks/${entry.script} which does not exist`);
    }
  } catch {
    error('hooks-manifest', 'agent-os/hooks/hooks.json is not valid JSON');
  }
}

const targetsRegistryFile = join(agentOsDirectory, 'platforms', 'targets.json');
if (existsSync(targetsRegistryFile)) {
  try {
    const registry = JSON.parse(readText(targetsRegistryFile));
    if (!registry.agents || Object.keys(registry.agents).length === 0)
      error('targets-registry', 'platforms/targets.json declares no agents');
  } catch {
    error('targets-registry', 'agent-os/platforms/targets.json is not valid JSON');
  }
}

const requirementForm = join(repositoryRoot, 'docs', 'getting-started', 'requirement-format.md');
if (!existsSync(requirementForm)) {
  error('requirement-form', 'docs/getting-started/requirement-format.md is missing');
}

const errors = findings.filter((finding) => finding.level === 'error');
const warnings = findings.filter((finding) => finding.level === 'warn');

const checkLabels = {
  'skill-frontmatter': 'Skill frontmatter & names',
  'skill-stub': 'Skill stub directories',
  'skill-registry-path': 'Skill-registry paths',
  'skill-registry-coverage': 'Skill-registry coverage',
  'skill-registry-count': 'Skill-registry counts',
  'skill-description': 'Skill descriptions',
  'agent-frontmatter': 'Agent frontmatter',
  'hook-portability': 'Hook portability',
  'hook-script': 'Hook scripts exist',
  'referenced-path': 'Referenced paths exist',
  'hooks-manifest': 'Hook manifest scripts exist',
  'targets-registry': 'Capability registry valid',
  'requirement-form': 'Requirement intake doc',
};

console.log('\nagent-os integrity evals (Tier 1 — core-fe)\n');
console.log(
  `  skills (SKILL.md): ${skillsWithManifest.length}   skill dirs: ${skillDirectoryNames.length}   agents: ${agentFiles.length}\n`,
);

/** @param {'error' | 'warn'} level */
const group = (level) => {
  const list = findings.filter((finding) => finding.level === level);
  /** @type {Map<string, string[]>} */
  const byCheck = new Map();
  for (const finding of list)
    byCheck.set(finding.check, [...(byCheck.get(finding.check) ?? []), finding.message]);
  return byCheck;
};

if (errors.length || reportMode) {
  for (const [check, messages] of group('error')) {
    console.log(`  ✗ ${checkLabels[check] ?? check}`);
    for (const message of messages) console.log(`      ${message}`);
  }
}
if (warnings.length) {
  for (const [check, messages] of group('warn')) {
    console.log(`  ⚠ ${checkLabels[check] ?? check} (${messages.length})`);
    if (reportMode) for (const message of messages) console.log(`      ${message}`);
  }
}

if (reportMode) {
  const checksWithFindings = new Set(findings.map((finding) => finding.check));
  for (const [check, label] of Object.entries(checkLabels))
    if (!checksWithFindings.has(check)) console.log(`  ✓ ${label}`);
}

console.log('');
if (errors.length) {
  console.log(`✗ FAILED — ${errors.length} integrity error(s), ${warnings.length} warning(s)\n`);
  process.exit(1);
}
console.log(`✓ PASSED — 0 errors, ${warnings.length} warning(s)\n`);
