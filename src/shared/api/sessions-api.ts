import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

import { type Session, sessionWireSchema, toSession } from './session-contracts.ts';
import { sessionMockStore } from './session-mock-store.ts';

const SESSIONS_API = `${API_BASE_PATH}/auth/me/sessions`;

/** The signed-in user's active sessions (`GET /auth/me/sessions`). */
export async function listSessions(): Promise<Session[]> {
  if (config.useMockApi) return mockResponse(sessionMockStore.list());
  const res = await apiClient.get<unknown>(SESSIONS_API);
  return z.array(sessionWireSchema).parse(res.data).map(toSession);
}

/** Revoke (sign out) another session (`DELETE /auth/me/sessions/:id`). */
export async function revokeSession(id: string): Promise<void> {
  if (config.useMockApi) {
    sessionMockStore.revoke(id);
    return mockResponse(undefined);
  }
  await apiClient.delete<unknown>(`${SESSIONS_API}/${id}`);
}
