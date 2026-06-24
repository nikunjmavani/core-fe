import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import { type Passkey, passkeySchema } from './passkey-contracts.ts';
import { passkeyMockStore } from './passkey-mock-store.ts';

/**
 * Passkey management (core-be #795: `/auth/me/webauthn/*`). Listing and revoking
 * are plain CRUD on `…/credentials`; *registration* runs the WebAuthn ceremony —
 * fetch creation options, `navigator.credentials.create()`, then verify. The
 * mock skips the ceremony and records a named credential.
 *
 * NOTE: the exact options/verify JSON shapes (camelCase vs snake_case, field
 * names) are pinned in core-be's docs/reference/api/frontend-endpoint-mapping.md;
 * the encode/decode below follows the standard WebAuthn base64url convention.
 */
const WEBAUTHN_API = `${API_BASE_PATH}/auth/me/webauthn`;

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

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // base64 padding is at most two '=' — bounded quantifier avoids slow-regex.
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/={1,2}$/, '');
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

/** Server creation options (WebAuthn standard, with base64url binary fields). */
interface CreationOptionsJson {
  challenge: string;
  rp: { id?: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: { id: string; type: 'public-key' }[];
}

/** Registered passkeys (`GET /auth/me/webauthn/credentials`). */
export async function listPasskeys(): Promise<Passkey[]> {
  if (config.useMockApi) return mockResponse(passkeyMockStore.list());
  const res = await apiClient.get<unknown>(`${WEBAUTHN_API}/credentials`);
  const data = res.data;
  if (!Array.isArray(data)) return [];
  return data.map((raw) => fromWire(wireSchema.parse(raw)));
}

/**
 * Register a passkey via the WebAuthn ceremony:
 * 1. `POST …/webauthn/register/options` → creation options
 * 2. `navigator.credentials.create()` in the browser
 * 3. `POST …/webauthn/register/verify` → the stored credential
 * The mock records the credential by name (no ceremony).
 */
export async function registerPasskey(name: string): Promise<Passkey> {
  if (config.useMockApi) return mockResponse(passkeyMockStore.add(name));

  const optionsRes = await apiClient.post<unknown>(`${WEBAUTHN_API}/register/options`, {
    name,
  });
  const options = optionsRes.data as CreationOptionsJson;

  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: base64UrlToBuffer(options.challenge),
      user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((c) => ({
        id: base64UrlToBuffer(c.id),
        type: c.type,
      })),
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey registration was cancelled.');

  const attestation = credential.response as AuthenticatorAttestationResponse;
  const verifyRes = await apiClient.post<unknown>(`${WEBAUTHN_API}/register/verify`, {
    name,
    credential: {
      id: credential.id,
      raw_id: bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        client_data_json: bufferToBase64Url(attestation.clientDataJSON),
        attestation_object: bufferToBase64Url(attestation.attestationObject),
      },
    },
  });
  return fromWire(wireSchema.parse(verifyRes.data));
}

/** Revoke a passkey (`DELETE /auth/me/webauthn/credentials/:credential_id`). */
export async function removePasskey(id: string): Promise<void> {
  if (config.useMockApi) {
    passkeyMockStore.remove(id);
    return mockResponse(undefined);
  }
  await apiClient.delete<unknown>(
    `${WEBAUTHN_API}/credentials/${encodeURIComponent(id)}`,
  );
}
