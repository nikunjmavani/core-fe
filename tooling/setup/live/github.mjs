/**
 * Live automation — GitHub secrets via gh CLI
 * @module tooling/setup/live/github
 */

import { spawn } from 'node:child_process';

/**
 * Set a GitHub repository secret using gh CLI.
 * Requires: gh auth login
 * @param {string} name - Secret name
 * @param {string} value - Secret value
 * @returns {Promise<void>}
 */
export async function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['secret', 'set', name], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    proc.on('error', reject);
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`gh secret set ${name} exited ${code}`))
    );
    proc.stdin.write(value, () => proc.stdin.end());
  });
}

/**
 * Delete a GitHub repository secret.
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function deleteSecret(name) {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['secret', 'delete', name], {
      stdio: 'inherit',
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh secret delete ${name} exited ${code}`));
    });
  });
}

/**
 * Check if gh is authenticated and can list secrets.
 * @returns {Promise<boolean>}
 */
export async function canSetSecrets() {
  try {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8' });
    return r.status === 0;
  } catch {
    return false;
  }
}
