/**
 * Live automation — Netlify REST API client
 * @module tooling/setup/live/netlify
 */

const BASE = 'https://api.netlify.com/api/v1';

/**
 * List sites for account (check only, no create).
 * @param {string} token
 * @param {string} accountSlug
 * @returns {Promise<Array<{ id: string; name: string; ssl_url?: string }>>}
 */
export async function listSites(token, accountSlug) {
  const res = await fetch(`${BASE}/${accountSlug}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Netlify list sites failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Ensure a Netlify site exists; create if missing.
 * @param {string} token - NETLIFY_AUTH_TOKEN
 * @param {string} accountSlug - Netlify team slug
 * @param {string} siteName - e.g. core-fe-main
 * @returns {Promise<{ id: string; name: string; url?: string; account_id: string }>}
 */
export async function ensureSite(token, accountSlug, siteName) {
  const listRes = await fetch(`${BASE}/${accountSlug}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    throw new Error(`Netlify list sites failed: ${listRes.status} ${await listRes.text()}`);
  }
  const sites = await listRes.json();
  const existing = sites.find(
    (s) => s.name === siteName || (s.subdomain && s.subdomain === siteName)
  );
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      url: existing.ssl_url,
      account_id: existing.account_id,
    };
  }
  const createRes = await fetch(`${BASE}/${accountSlug}/sites`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: siteName }),
  });
  if (!createRes.ok) {
    throw new Error(`Netlify create site failed: ${createRes.status} ${await createRes.text()}`);
  }
  const site = await createRes.json();
  return {
    id: site.id,
    name: site.name,
    url: site.ssl_url,
    account_id: site.account_id,
  };
}

/**
 * Set env vars for a Netlify site. Uses PUT per key for upsert.
 * @param {string} token
 * @param {string} accountId
 * @param {string} siteId
 * @param {Record<string, string>} vars
 * @param {'all'|'production'|'deploy-preview'|'branch-deploy'} [context='all']
 */
export async function setEnvVars(token, accountId, siteId, vars, context = 'all') {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  for (const [key, value] of Object.entries(vars)) {
    const body = {
      key,
      scopes: ['builds'],
      values: [{ value, context }],
      is_secret: false,
    };
    const res = await fetch(
      `${BASE}/accounts/${accountId}/env/${encodeURIComponent(key)}?site_id=${siteId}`,
      { method: 'PUT', headers, body: JSON.stringify(body) }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Netlify set env ${key} failed: ${res.status} ${txt}`);
    }
  }
}

/**
 * Delete a Netlify site.
 * @param {string} token
 * @param {string} siteId
 */
export async function deleteSite(token, siteId) {
  const res = await fetch(`${BASE}/sites/${siteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Netlify delete site failed: ${res.status} ${txt}`);
  }
}
