import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { acceptInvitation, getMyPermissions } from '@/shared/api/organization-api.ts';
import { startMockSession } from '@/shared/auth/mock-auth.ts';
import { MOCK_ACCESS_TOKEN, MOCK_USER } from '@/shared/auth/mock-auth.ts';
import { scheduleTokenRefresh } from '@/shared/auth/refresh-timer.ts';
import { setAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import {
  persistTenantToStorage,
  useTenantStore,
} from '@/shared/store/useTenantStore/index.ts';

type Status = 'accepting' | 'success' | 'error';

/**
 * Accepts a membership invitation by token, then auto-logs the user in and lands
 * them on the dashboard. Shows a clear error state for expired/invalid links.
 */
export function AcceptInvitePage() {
  const { invitationId } = useParams({ from: '/accept-invite/$invitationId' });
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('accepting');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const accepted = await acceptInvitation(invitationId);

        // Auto-login the (mock) user and activate the joined organization.
        setAccessToken(MOCK_ACCESS_TOKEN);
        startMockSession();
        useAuthStore.getState().setUser(MOCK_USER);
        scheduleTokenRefresh();

        const tenant = useTenantStore.getState();
        tenant.setTenant(accepted.organizationId, accepted.organizationSlug);
        persistTenantToStorage(accepted.organizationId, accepted.organizationSlug);
        tenant.setPermissions(await getMyPermissions());

        setStatus('success');
        setTimeout(() => navigate({ to: '/', replace: true }), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not accept the invitation.');
        setStatus('error');
      }
    })();
  }, [invitationId, navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      data-testid="accept-invite-page"
    >
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            {status === 'error' ? 'Invitation problem' : 'Joining organization'}
          </CardTitle>
          <CardDescription>
            {status === 'accepting' && 'Accepting your invitation…'}
            {status === 'success' && 'You\u2019re in! Redirecting to your dashboard…'}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'accepting' && (
            <Loader2
              className="text-muted-foreground h-10 w-10 animate-spin"
              data-testid="accept-invite-loading"
            />
          )}
          {status === 'success' && (
            <CheckCircle2
              className="h-10 w-10 text-emerald-500"
              data-testid="accept-invite-success"
            />
          )}
          {status === 'error' && (
            <>
              <XCircle
                className="text-destructive h-10 w-10"
                data-testid="accept-invite-error"
              />
              <Button asChild data-testid="accept-invite-login">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
