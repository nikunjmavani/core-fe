import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import { type Passkey, passkeySchema } from './passkey-contracts.ts';
import { passkeyMockStore } from './passkey-mock-store.ts';

/**
 * Passkey management (core-be `/auth/me/passkeys`), mock-first (FE-32). Listing
 * and revoking are plain CRUD; *registration* in the live path runs the WebAuthn
 * ceremony (`navigator.credentials.create()` against a server challenge) before
 * the POST — the mock skips the ceremony and records a named credential.
 */
const PASSKEYS_API = `${API_BASE_PATH}/auth/me/passkeys`;

const wireSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
});

function fromWire(wire: z.infer<typeof wireSchema>): Passkey {
  return passkeySchema.parse({
    id: wire.id,
    name: wire.name,
    createdAt: wire.created_at,
    lastUsedAt: wire.last_used_at,
  });
}

/** Registered passkeys for the account (`GET /auth/me/passkeys`). */
export async function listPasskeys(): Promise<Passkey[]> {
  if (config.useMockApi) return mockResponse(passkeyMockStore.list());
  const res = await apiClient.get<unknown>(PASSKEYS_API);
  const data = res.data;
  if (!Array.isArray(data)) return [];
  return data.map((raw) => fromWire(wireSchema.parse(raw)));
}

/**
 * Register a passkey (`POST /auth/me/passkeys`). REPLACE_WITH_API: the live path
 * must first run the WebAuthn registration ceremony and send the attestation;
 * the mock records the credential by name.
 */
export async function registerPasskey(name: string): Promise<Passkey> {
  if (config.useMockApi) return mockResponse(passkeyMockStore.add(name));
  const res = await apiClient.post<unknown>(PASSKEYS_API, { name });
  return fromWire(wireSchema.parse(res.data));
}

/** Revoke a passkey (`DELETE /auth/me/passkeys/:id`). */
export async function removePasskey(id: string): Promise<void> {
  if (config.useMockApi) {
    passkeyMockStore.remove(id);
    return mockResponse(undefined);
  }
  await apiClient.delete<unknown>(`${PASSKEYS_API}/${encodeURIComponent(id)}`);
}
