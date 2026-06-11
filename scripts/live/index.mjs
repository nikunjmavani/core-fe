#!/usr/bin/env node
/**
 * Live automation — one command to go live
 *
 * Usage:
 *   pnpm run setup          Full provisioning (Netlify, GitHub secrets, deploy)
 *   pnpm run setup:check    Validate state + health (Netlify, GitHub)
 *   pnpm run setup:revert:all  Tear down everything
 *
 * Required env: NETLIFY_AUTH_TOKEN
 */

import { loadConfig } from './config.mjs';
import * as netlify from './netlify.mjs';
import * as github from './github.mjs';
import { confirm, chooseEnv } from './prompts.mjs';
import { spawnSync } from 'node:child_process';

const cmd = process.argv[2] || 'live';

const GITHUB_SECRETS_MAIN = ['VITE_API_BASE_URL', 'NODE_VERSION', 'NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID'];

async function main() {
  const config = await loadConfig();

  if (!config.orgName) {
    console.error('[live] Missing SETUP_ORG_NAME in config.setup.env. Set your Netlify team slug.');
    process.exit(1);
  }

  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;

  if (cmd === 'check') {
    await runCheck(config, netlifyToken);
    return;
  }

  if (cmd === 'update') {
    await runUpdate(config, netlifyToken);
    return;
  }

  if (cmd === 'revert') {
    await runRevert(config, netlifyToken);
    return;
  }

  if (cmd === 'live') {
    await runLive(config, netlifyToken);
    return;
  }

  console.error(`[live] Unknown command: ${cmd}. Use: live | check | update | revert`);
  process.exit(1);
}

function formatConfigSummary(config, envsToShow) {
  const envs = envsToShow ?? config.envs;
  const lines = [
    `  Project: ${config.projectName}`,
    `  Org: ${config.orgName}`,
    `  Envs: ${envs.join(', ')}`,
    '',
    '  Per-env:',
  ];
  for (const env of envs) {
    const { siteName, apiBaseUrl, demoMode } = config.perEnv[env];
    lines.push(`    ${env}: site=${siteName} api=${apiBaseUrl || '(default)'} demo=${demoMode}`);
  }
  return lines.join('\n');
}

async function detectExisting(config, netlifyToken) {
  const existing = [];
  if (netlifyToken) {
    try {
      const sites = await netlify.listSites(netlifyToken, config.orgName);
      for (const env of config.envs) {
        const { siteName } = config.perEnv[env];
        if (sites.some((s) => s.name === siteName || s.subdomain === siteName)) {
          existing.push(`Netlify site "${siteName}"`);
        }
      }
    } catch {
      // ignore
    }
  }
  const ghOk = await github.canSetSecrets();
  if (ghOk) {
    try {
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync('gh', ['secret', 'list'], { encoding: 'utf-8' });
      if (r.status === 0 && r.stdout) {
        for (const name of GITHUB_SECRETS_MAIN) {
          if (r.stdout.includes(name)) existing.push(`GitHub secret ${name}`);
        }
      }
    } catch {
      // ignore
    }
  }
  return existing;
}

async function runCheck(config, netlifyToken) {
  console.log('[live] Checking setup...\n');

  if (!netlifyToken) console.log('  NETLIFY_AUTH_TOKEN: missing');
  else console.log('  NETLIFY_AUTH_TOKEN: set');

  if (netlifyToken) {
    try {
      const sites = await netlify.listSites(netlifyToken, config.orgName);
      for (const env of config.envs) {
        const { siteName } = config.perEnv[env];
        const site = sites.find((s) => s.name === siteName || s.subdomain === siteName);
        if (site) console.log(`  Netlify site "${siteName}": ${site.ssl_url || site.id}`);
        else console.log(`  Netlify site "${siteName}": not found`);
      }
    } catch (e) {
      console.log('  Netlify:', e.message);
    }
  }

  const ghOk = await github.canSetSecrets();
  console.log(`  GitHub (gh): ${ghOk ? 'authenticated' : 'not authenticated'}`);

  console.log('\n[live] Check complete.');
}

async function runUpdate(config, netlifyToken) {
  console.log('[live] Updating Netlify from config...\n');

  if (!netlifyToken) {
    console.error('[live] NETLIFY_AUTH_TOKEN is required.');
    process.exit(1);
  }

  for (const env of config.envs) {
    const { siteName, apiBaseUrl, demoMode } = config.perEnv[env];
    try {
      const site = await netlify.ensureSite(netlifyToken, config.orgName, siteName);
      await netlify.setEnvVars(
        netlifyToken,
        site.account_id,
        site.id,
        {
          VITE_API_BASE_URL: apiBaseUrl || '',
          VITE_DEMO_MODE: demoMode || 'false',
          NODE_VERSION: config.nodeVersion,
        },
        'all'
      );
      console.log(`  Netlify ${siteName}: env updated`);
    } catch (e) {
      console.error(`  Netlify ${siteName}:`, e.message);
      process.exit(1);
    }
  }

  console.log('\n[live] Update complete. Run pnpm run setup:infra:github-secrets to sync GitHub secrets from config.');
}

async function runRevert(config, netlifyToken) {
  const options = [...config.envs, 'all'];
  const choice = await chooseEnv('Which environment do you want to revert?', options);
  if (!choice) {
    console.log('[live] Invalid choice. Aborted.');
    process.exit(0);
  }

  const envsToRevert = choice === 'all' ? config.envs : [choice];

  console.log(`\n[live] Revert ${choice} — will remove for this env across all services:\n`);
  for (const env of envsToRevert) {
    const { siteName } = config.perEnv[env];
    console.log(`  ${env}: Netlify site "${siteName}"`);
  }
  if (envsToRevert.includes('main')) {
    console.log('  main: + GitHub secrets (VITE_API_BASE_URL, NODE_VERSION, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID)');
  }
  console.log('');

  const ok = await confirm('Proceed? (Only this environment will be reverted — no partial services)');
  if (!ok) {
    console.log('[live] Aborted.');
    process.exit(0);
  }

  let reverted = 0;

  for (const env of envsToRevert) {
    const { siteName } = config.perEnv[env];

    if (netlifyToken) {
      try {
        const sites = await netlify.listSites(netlifyToken, config.orgName);
        const site = sites.find((s) => s.name === siteName || s.subdomain === siteName);
        if (site) {
          await netlify.deleteSite(netlifyToken, site.id);
          console.log(`  [${env}] Deleted Netlify site: ${siteName}`);
          reverted++;
        }
      } catch (e) {
        console.warn(`  [${env}] Netlify:`, e.message);
      }
    }

    if (env === 'main') {
      const ghOk = await github.canSetSecrets();
      if (ghOk) {
        for (const name of GITHUB_SECRETS_MAIN) {
          try {
            await github.deleteSecret(name);
            console.log(`  [main] Removed GitHub secret: ${name}`);
            reverted++;
          } catch (e) {
            console.warn(`  [main] GitHub ${name}:`, e.message);
          }
        }
      }
    }
  }

  console.log(`\n[live] Revert complete. (${reverted} items removed)`);
}

async function runLive(config, netlifyToken) {
  const options = [...config.envs, 'all'];
  const choice = await chooseEnv('Which environment do you want to set up?', options);
  if (!choice) {
    console.log('[live] Invalid choice. Aborted.');
    process.exit(0);
  }

  const envsToSetup = choice === 'all' ? config.envs : [choice];

  console.log('\n[live] Setup ' + choice + '\n');
  console.log('=== CONFIGURATION ===\n');
  console.log(formatConfigSummary(config, envsToSetup));
  console.log('\n=== WHAT WILL BE CREATED ===\n');
  for (const env of envsToSetup) {
    const { siteName } = config.perEnv[env];
    console.log(`  ${env}: Netlify site "${siteName}"`);
  }
  if (envsToSetup.includes('main')) {
    console.log('  main: + GitHub secrets (VITE_API_BASE_URL, NODE_VERSION, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID)');
    console.log('  main: + Deploy (build + netlify deploy --prod)');
  }
  console.log('');

  const ok1 = await confirm('Do you want to use these settings and proceed?');
  if (!ok1) {
    console.log('[live] Aborted.');
    process.exit(0);
  }

  const existing = await detectExisting(config, netlifyToken);
  const conflicts = [];
  for (const env of envsToSetup) {
    const { siteName } = config.perEnv[env];
    if (existing.some((x) => x.includes(siteName))) conflicts.push(`Netlify site "${siteName}"`);
    if (env === 'main' && existing.some((x) => x.includes('GitHub secret'))) {
      conflicts.push('GitHub secrets');
    }
  }
  if (conflicts.length > 0) {
    console.log('\n[live] The following are already configured:\n');
    conflicts.forEach((c) => console.log(`  - ${c}`));
    console.log('\n  Run: pnpm run setup:revert:all (choose same env)');
    console.log('  Then run: pnpm run setup again\n');
    const ok2 = await confirm('Abort and run revert first? (Recommended)');
    if (ok2) {
      console.log('[live] Run: pnpm run setup:revert:all');
      process.exit(0);
    }
    const ok3 = await confirm('Proceed anyway? (May overwrite existing)');
    if (!ok3) {
      console.log('[live] Aborted.');
      process.exit(0);
    }
  }

  const ok4 = await confirm('Final confirmation: proceed with setup? (No partial — full env across all services)');
  if (!ok4) {
    console.log('[live] Aborted.');
    process.exit(0);
  }

  if (!netlifyToken) {
    console.error('[live] NETLIFY_AUTH_TOKEN is required.');
    process.exit(1);
  }

  const siteIds = {};
  const createdSites = [];
  let ghSecretsSet = false;

  const rollback = async (reason) => {
    console.error(`\n[live] ${reason} — rolling back...`);
    if (ghSecretsSet) {
      try {
        for (const name of GITHUB_SECRETS_MAIN) {
          await github.deleteSecret(name);
        }
        console.log('  Reverted GitHub secrets');
      } catch (e) {
        console.warn('  Rollback GitHub:', e.message);
      }
    }
    for (const id of createdSites) {
      try {
        await netlify.deleteSite(netlifyToken, id);
        console.log('  Deleted Netlify site:', id);
      } catch (e) {
        console.warn('  Rollback Netlify:', e.message);
      }
    }
    console.error('[live] Rollback complete. No partial state.');
    process.exit(1);
  };

  try {
    // 1. Netlify: ensure sites for chosen env
    console.log('\n1. Netlify: ensuring sites...');
    const sitesBefore = await netlify.listSites(netlifyToken, config.orgName);
    for (const env of envsToSetup) {
      const { siteName, apiBaseUrl, demoMode } = config.perEnv[env];
      const site = await netlify.ensureSite(netlifyToken, config.orgName, siteName);
      const wasNew = !sitesBefore.some((s) => s.id === site.id);
      if (wasNew) createdSites.push(site.id);
      siteIds[env] = site.id;
      await netlify.setEnvVars(
        netlifyToken,
        site.account_id,
        site.id,
        {
          VITE_API_BASE_URL: apiBaseUrl || '',
          VITE_DEMO_MODE: demoMode || 'false',
          NODE_VERSION: config.nodeVersion,
        },
        'all'
      );
      console.log(`   - ${siteName}: ${site.url || site.id}`);
    }

    // 2. GitHub: set secrets (main only)
    const ghOk = await github.canSetSecrets();
    const mainEnv = config.perEnv.main;
    if (envsToSetup.includes('main') && ghOk && siteIds.main && mainEnv) {
      console.log('\n2. GitHub: setting secrets...');
      await github.setSecret('VITE_API_BASE_URL', mainEnv.apiBaseUrl || '');
      await github.setSecret('NODE_VERSION', config.nodeVersion);
      await github.setSecret('NETLIFY_AUTH_TOKEN', netlifyToken);
      await github.setSecret('NETLIFY_SITE_ID', siteIds.main);
      ghSecretsSet = true;
      console.log('   - VITE_API_BASE_URL, NODE_VERSION, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID: set');
    } else if (envsToSetup.includes('main')) {
      console.log('\n2. GitHub: skipping (gh auth login or set manually via setup:infra:github-secrets)');
    }

    // 3. Deploy (main only)
    if (!envsToSetup.includes('main')) {
      console.log('\n[live] Setup complete. (No deploy for non-main env)');
      return;
    }
    console.log('\n3. Deploying to production...');
    const mainApiUrl = mainEnv?.apiBaseUrl || '';
    const build = spawnSync('pnpm', ['run', 'build'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        VITE_API_BASE_URL: mainApiUrl,
        NODE_VERSION: config.nodeVersion,
        NETLIFY_AUTH_TOKEN: netlifyToken,
        NETLIFY_SITE_ID: siteIds.main,
      },
    });
    if (build.status !== 0) {
      await rollback('Build failed');
    }
    const deploy = spawnSync(
      'pnpm',
      ['exec', 'netlify', 'deploy', '--prod', '--dir=dist'],
      {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, NETLIFY_AUTH_TOKEN: netlifyToken, NETLIFY_SITE_ID: siteIds.main },
      }
    );
    if (deploy.status !== 0) {
      await rollback('Deploy failed');
    }

    console.log('\n[live] Done. Your site is live.');
  } catch (e) {
    await rollback(e.message);
  }
}

main().catch((e) => {
  console.error('[live]', e.message);
  process.exit(1);
});
