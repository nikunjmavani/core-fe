import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';

import { type Session, sessionWireSchema, toSession } from './session-contracts.ts';

const SESSIONS_API = `${API_BASE_PATH}/auth/me/sessions`;

export async function listSessions(): Promise<Session[]> {
  const res = await apiClient.get<unknown>(SESSIONS_API);
  return z.array(sessionWireSchema).parse(res.data).map(toSession);
}

export async function revokeSession(id: string): Promise<void> {
  await apiClient.delete<unknown>(`${SESSIONS_API}/${id}`);
}
