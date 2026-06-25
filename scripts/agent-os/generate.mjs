#!/usr/bin/env node
/**
 * agent-os generator — compiles each agent's native wiring FROM the common
 * agent-os/ sources into agent-os/platforms/ (tool dirs symlink there).
 *
 * Single source: agent-os/hooks/hooks.json + agent-os/platforms/targets.json
 *
 * Usage:
 *   node scripts/agent-os/generate.mjs            # default: --check
 *   node scripts/agent-os/generate.mjs --check
 *   node scripts/agent-os/generate.mjs --write
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const repositoryRoot = process.cwd();
const agentOsDirectory = join(repositoryRoot, 'agent-os');
const writeMode = process.argv.includes('--write');

/** @typedef {{ id: string; runtime: 'bash' | 'node'; script: string; claude?: { event: string; matcher?: string }; cursor?: { event: string; matcher?: string }; codex?: { event: string; matcher?: string; statusMessage?: string } }} HookManifestEntry */
/** @typedef {{ hooks: HookManifestEntry[] }} HookManifest */
/** @typedef {{ capabilities: { hookEvents: string[]; mcpFormat?: string }; hooksTarget: string | null }} AgentTarget */
/** @typedef {{ agents: Record<string, AgentTarget> }} TargetsRegistry */

const readJson = (absolutePath) => JSON.parse(readFileSync(absolutePath, 'utf8'));

/** @type {string[]} */
const problems = [];
const report = (message) => problems.push(message);

const manifest = /** @type {HookManifest} */ (
  readJson(join(agentOsDirectory, 'hooks', 'hooks.json'))
);
const targets = /** @type {TargetsRegistry} */ (
  readJson(join(agentOsDirectory, 'platforms', 'targets.json'))
);

const claudeTarget = targets.agents.claude;
const cursorTarget = targets.agents.cursor;
const codexTarget = targets.agents.codex;

const claudeCommand = (entry) =>
  `${entry.runtime} "$CLAUDE_PROJECT_DIR/agent-os/hooks/${entry.script}"`;
const cursorCommand = (entry) => `${entry.runtime} ../agent-os/hooks/${entry.script}`;
const codexCommand = (entry) =>
  `CLAUDE_PROJECT_DIR="$(git rev-parse --show-toplevel)" ${entry.runtime} "$(git rev-parse --show-toplevel)/agent-os/hooks/${entry.script}"`;

/** @returns {Record<string, unknown[]>} */
function buildClaudeHooks() {
  const supported = new Set(claudeTarget?.capabilities.hookEvents ?? []);
  /** @type {Record<string, unknown[]>} */
  const grouped = {};
  for (const entry of manifest.hooks) {
    if (!entry.claude) continue;
    if (!supported.has(entry.claude.event)) {
      report(
        `claude: hook "${entry.id}" targets unsupported event ${entry.claude.event} — skipped`,
      );
      continue;
    }
    const command = claudeCommand(entry);
    const hookEntry = entry.claude.matcher
      ? { matcher: entry.claude.matcher, hooks: [{ type: 'command', command }] }
      : { hooks: [{ type: 'command', command }] };
    const event = entry.claude.event;
    grouped[event] = [...(grouped[event] ?? []), hookEntry];
  }
  return grouped;
}

/** @returns {Record<string, Array<{ command: string }>>} */
function buildCursorHooks() {
  const supported = new Set(cursorTarget?.capabilities.hookEvents ?? []);
  /** @type {Record<string, Array<{ command: string }>>} */
  const grouped = {};
  for (const entry of manifest.hooks) {
    if (!entry.cursor) continue;
    if (!supported.has(entry.cursor.event)) {
      report(
        `cursor: hook "${entry.id}" targets unsupported event ${entry.cursor.event} — skipped`,
      );
      continue;
    }
    const event = entry.cursor.event;
    grouped[event] = [...(grouped[event] ?? []), { command: cursorCommand(entry) }];
  }
  return grouped;
}

/** @returns {Record<string, unknown[]>} */
function buildCodexHooks() {
  const supported = new Set(codexTarget?.capabilities.hookEvents ?? []);
  /** @type {Record<string, unknown[]>} */
  const grouped = {};
  for (const entry of manifest.hooks) {
    if (!entry.codex) continue;
    if (!supported.has(entry.codex.event)) {
      report(`codex: hook "${entry.id}" targets unsupported event ${entry.codex.event} — skipped`);
      continue;
    }
    /** @type {{ type: 'command'; command: string; statusMessage?: string }} */
    const hook = { type: 'command', command: codexCommand(entry) };
    if (entry.codex.statusMessage) hook.statusMessage = entry.codex.statusMessage;
    const hookEntry = entry.codex.matcher
      ? { matcher: entry.codex.matcher, hooks: [hook] }
      : { hooks: [hook] };
    const event = entry.codex.event;
    grouped[event] = [...(grouped[event] ?? []), hookEntry];
  }
  return grouped;
}

/** @param {unknown} value */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const sorted = {};
    for (const key of Object.keys(value).sort())
      sorted[key] = canonical(/** @type {Record<string, unknown>} */ (value)[key]);
    return sorted;
  }
  return value;
}

const deepEqual = (left, right) =>
  JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

/** @param {Record<string, { command?: string; args?: string[] }>} servers */
function toCodexToml(servers) {
  const lines = [
    '# Generated by scripts/agent-os/generate.mjs from agent-os/mcp/mcp.default.json — do not edit by hand.',
    '',
  ];
  for (const [name, definition] of Object.entries(servers)) {
    lines.push(`[mcp_servers.${name}]`);
    if (definition.command) lines.push(`command = ${JSON.stringify(definition.command)}`);
    if (definition.args?.length)
      lines.push(
        `args = [${definition.args.map((argument) => JSON.stringify(argument)).join(', ')}]`,
      );
    lines.push('');
  }
  return lines.join('\n');
}

const claudeHooks = buildClaudeHooks();
const cursorHooks = buildCursorHooks();
const codexHooks = buildCodexHooks();

const claudeSettingsPath = join(
  repositoryRoot,
  claudeTarget?.hooksTarget ?? 'agent-os/platforms/claude/settings.json',
);
if (existsSync(claudeSettingsPath)) {
  const settings = readJson(claudeSettingsPath);
  if (writeMode) {
    if (!deepEqual(settings.hooks, claudeHooks)) {
      settings.hooks = claudeHooks;
      writeFileSync(claudeSettingsPath, `${JSON.stringify(settings, null, 2)}\n`);
      report('wrote agent-os/platforms/claude/settings.json');
    }
  } else if (!deepEqual(settings.hooks, claudeHooks)) {
    report(
      'drift: agent-os/platforms/claude/settings.json hooks differ from agent-os/hooks/hooks.json — run `pnpm agent-os:generate`',
    );
  }
} else report(`missing: ${claudeSettingsPath}`);

const cursorHooksPath = join(
  repositoryRoot,
  cursorTarget?.hooksTarget ?? 'agent-os/platforms/cursor/hooks.json',
);
if (existsSync(cursorHooksPath)) {
  const cursorConfig = readJson(cursorHooksPath);
  if (writeMode) {
    if (!deepEqual(cursorConfig.hooks, cursorHooks)) {
      cursorConfig.hooks = cursorHooks;
      writeFileSync(cursorHooksPath, `${JSON.stringify(cursorConfig, null, 2)}\n`);
      report('wrote agent-os/platforms/cursor/hooks.json');
    }
  } else if (!deepEqual(cursorConfig.hooks, cursorHooks)) {
    report(
      'drift: agent-os/platforms/cursor/hooks.json differs from agent-os/hooks/hooks.json — run `pnpm agent-os:generate`',
    );
  }
} else report(`missing: ${cursorHooksPath}`);

const codexHooksPath = join(
  repositoryRoot,
  codexTarget?.hooksTarget ?? 'agent-os/platforms/codex/hooks.json',
);
const codexHooksFile = { hooks: codexHooks };
if (writeMode) {
  const current = existsSync(codexHooksPath) ? readJson(codexHooksPath) : null;
  if (!deepEqual(current, codexHooksFile)) {
    mkdirSync(dirname(codexHooksPath), { recursive: true });
    writeFileSync(codexHooksPath, `${JSON.stringify(codexHooksFile, null, 2)}\n`);
    report('wrote agent-os/platforms/codex/hooks.json');
  }
} else if (!existsSync(codexHooksPath)) {
  report(`missing: ${codexHooksPath}`);
} else if (!deepEqual(readJson(codexHooksPath), codexHooksFile)) {
  report(
    'drift: agent-os/platforms/codex/hooks.json differs from agent-os/hooks/hooks.json — run `pnpm agent-os:generate`',
  );
}

if (codexTarget?.capabilities.mcpFormat === 'toml') {
  const mcpDefaultPath = join(agentOsDirectory, 'mcp', 'mcp.default.json');
  const codexConfigPath = join(agentOsDirectory, 'platforms', 'codex', 'config.toml');
  if (existsSync(mcpDefaultPath)) {
    const servers =
      readJson(mcpDefaultPath).mcpServers ??
      /** @type {Record<string, { command?: string; args?: string[] }>} */ ({});
    const toml = toCodexToml(servers);
    const current = existsSync(codexConfigPath) ? readFileSync(codexConfigPath, 'utf8') : null;
    if (writeMode) {
      if (current !== toml) {
        mkdirSync(dirname(codexConfigPath), { recursive: true });
        writeFileSync(codexConfigPath, toml);
        report('wrote agent-os/platforms/codex/config.toml');
      }
    } else if (current !== toml) {
      report(
        'drift: agent-os/platforms/codex/config.toml differs from agent-os/mcp/mcp.default.json — run `pnpm agent-os:generate`',
      );
    }
  }
}

const drift = problems.filter(
  (message) => message.startsWith('drift') || message.startsWith('missing'),
);
console.log(`\nagent-os generate (${writeMode ? 'write' : 'check'})\n`);
console.log(`  agents: ${Object.keys(targets.agents).join(', ')}`);
console.log(
  `  claude hooks: ${Object.values(claudeHooks).flat().length}   cursor hooks: ${Object.values(cursorHooks).flat().length}   codex hooks: ${Object.values(codexHooks).flat().length}\n`,
);
for (const message of problems) console.log(`  • ${message}`);
console.log('');
if (!writeMode && drift.length) {
  console.log(`✗ DRIFT — ${drift.length} derived artifact(s) out of sync with agent-os/\n`);
  process.exit(1);
}
console.log(`✓ ${writeMode ? 'wrote derived artifacts' : 'in sync — no drift'}\n`);
