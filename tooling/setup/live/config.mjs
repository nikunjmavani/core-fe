/**
 * Live automation — load and parse config.setup.env
 * @module tooling/setup/live/config
 * @typedef {Object} LiveConfig
 * @property {string} projectName
 * @property {string} orgName
 * @property {string[]} envs
 * @property {string} nodeVersion
 * @property {Record<string, { apiBaseUrl: string; demoMode: string; siteName: string }>} perEnv
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(process.cwd(), 'config.setup.env');

/** @typedef {{ key: string; value: string }} EnvEntry */

/**
 * Parse env file into object (no shell expansion)
 * @param {string} raw
 * @returns {Record<string, string>}
 */
function parseEnv(raw) {
  const out = /** @type {Record<string, string>} */ ({});
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Load config from config.setup.env
 * @returns {Promise<LiveConfig>}
 */
export async function loadConfig() {
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const env = parseEnv(raw);
  const projectName = env.SETUP_PROJECT_NAME || 'core-fe';
  const orgName = env.SETUP_ORG_NAME || '';
  const envsRaw = env.SETUP_ENVS || 'dev,main';
  const envs = envsRaw.split(',').map((e) => e.trim()).filter(Boolean);
  const nodeVersion = env.NODE_VERSION?.trim();
  if (!nodeVersion) {
    throw new Error(
      '[live] NODE_VERSION is required in config.setup.env (e.g. NODE_VERSION=24). It must match CI and package engines.',
    );
  }

  /** @type {Record<string, { apiBaseUrl: string; demoMode: string; siteName: string }>} */
  const perEnv = {};
  for (const envKey of envs) {
    const suffix = envKey.toUpperCase().replace('-', '_');
    perEnv[envKey] = {
      apiBaseUrl: env[`VITE_API_BASE_URL_${suffix}`] || env.VITE_API_BASE_URL_PROD || '',
      demoMode: env[`VITE_DEMO_MODE_${suffix}`] ?? env.VITE_DEMO_MODE_PROD ?? 'false',
      siteName: env[`NETLIFY_SITE_${suffix}`] || `${projectName}-${envKey}`,
    };
  }

  return {
    projectName,
    orgName,
    envs,
    nodeVersion,
    perEnv,
  };
}
