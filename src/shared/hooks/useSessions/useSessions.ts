import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/shared/api/sessions-api.ts';
import { notify } from '@/shared/notify/index.ts';

const sessionsQueryKey = ['auth', 'sessions'] as const;

/** The signed-in user's active sessions. Server state only. */
export function useSessions() {
  return useQuery({ queryKey: sessionsQueryKey, queryFn: api.listSessions });
}

/** Revoke another session, then refresh the list. */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeSession(id),
    onSuccess: () => {
      notify.success('Signed out of that session');
      return queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
    },
    onError: () => notify.error('Could not sign out that session'),
  });
}
