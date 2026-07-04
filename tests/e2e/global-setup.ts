import pg from 'pg';

import {
  probeE2eAuthHeaders,
  writeCachedE2eAuthHeaders,
} from '@/tests/utils/e2e-captcha.ts';

/**
 * Fail fast when core-be is not running. All E2E specs require GET /readyz on :3000.
 * Auto-detects Postgres for mail_outbox reads when DATABASE_URL is unset.
 */
const CORE_BE_READY_URL = 'http://localhost:3000/readyz';

const DATABASE_URL_CANDIDATES = [
  process.env.DATABASE_URL,
  process.env.E2E_DATABASE_URL,
  'postgresql://core:core@localhost:5432/core',
  'postgresql://postgres:postgres@localhost:5432/core',
].filter((url): url is string => Boolean(url));

async function detectDatabaseUrl(): Promise<string | undefined> {
  for (const url of [...new Set(DATABASE_URL_CANDIDATES)]) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return url;
    } catch {
      // try next candidate
    } finally {
      await client.end().catch(() => undefined);
    }
  }
  return undefined;
}

export default async function globalSetup(): Promise<void> {
  try {
    const res = await fetch(CORE_BE_READY_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`GET ${CORE_BE_READY_URL} returned ${res.status}`);
    }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      [
        'E2E requires core-be on http://localhost:3000 (GET /readyz must succeed).',
        'Start core-be, then run pnpm test:e2e.',
        `Probe failed: ${detail}`,
      ].join('\n'),
      { cause },
    );
  }

  if (!(process.env.DATABASE_URL || process.env.E2E_DATABASE_URL)) {
    const detected = await detectDatabaseUrl();
    if (detected) {
      process.env.DATABASE_URL = detected;
      console.info(`E2E: using Postgres at ${detected} for email-code helpers`);
    } else {
      console.warn(
        [
          'WARNING: Could not connect to Postgres for auth.mail_outbox.',
          'Email-code UI/API E2E will skip authenticated flows.',
          'Set DATABASE_URL or E2E_DATABASE_URL (local core-be docker: postgresql://core:core@localhost:5432/core).',
        ].join(' '),
      );
    }
  }

  const authHeaders = await probeE2eAuthHeaders('http://localhost:3000');
  writeCachedE2eAuthHeaders(authHeaders);

  const sendCodeProbe = await fetch('http://localhost:3000/api/v1/auth/email/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ email: `e2e-probe-${Date.now()}@probe.local` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (sendCodeProbe.status === 429) {
    throw new Error(
      [
        'E2E auth probe: POST /auth/email/send-code returned 429 (rate limited).',
        'Restart core-be after pulling latest (development/test lift strict public auth caps),',
        'or wait ~60s and flush Redis rate-limit keys: redis-cli FLUSHDB',
        'CI runs core-be with NODE_ENV=test.',
      ].join(' '),
    );
  }
  if (sendCodeProbe.status !== 201) {
    throw new Error(
      `E2E auth probe: POST /auth/email/send-code returned ${sendCodeProbe.status} — ${await sendCodeProbe.text()}`,
    );
  }

  console.info(
    `E2E: captcha headers resolved (${Object.keys(authHeaders).join(', ')}) for public auth POSTs`,
  );
}
