/**
 * Live automation — interactive prompts
 * @module scripts/live/prompts
 */

import { createInterface } from 'node:readline';

/**
 * Ask user to choose an environment.
 * @param {string} question
 * @param {string[]} options - e.g. ['dev', 'qa', 'main', 'all']
 * @returns {Promise<string>} The chosen option
 */
export function chooseEnv(question, options) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const opts = options.join(' | ');
  return new Promise((resolve) => {
    rl.question(`${question}\n  Choices: ${opts}\n  Enter choice: `, (answer) => {
      rl.close();
      const choice = answer.trim().toLowerCase();
      if (options.includes(choice)) resolve(choice);
      else resolve('');
    });
  });
}

/**
 * Ask user a yes/no question. Requires typing "yes" (case-insensitive).
 * @param {string} question
 * @param {{ defaultNo?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export function confirm(question, opts = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question}\n  Type "yes" to confirm, anything else to abort: `, (answer) => {
      rl.close();
      const ok = answer.trim().toLowerCase() === 'yes';
      resolve(opts.defaultNo ? !ok : ok);
    });
  });
}
