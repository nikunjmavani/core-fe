import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { organizationDashboard } from '@/lib/routes/index.ts';
import { ANALYTICS_EVENTS } from '@/shared/analytics/analytics.constants.ts';
import { captureAnalyticsEvent } from '@/shared/analytics/capture.ts';
import { acceptInvitation } from '@/shared/api/organization-api.ts';
import { silentRefresh } from '@/shared/auth/service.ts';
import { getAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { HttpError } from '@/shared/errors/HttpError.ts';
import { mapFrontendError } from '@/shared/errors/map-frontend-error.ts';
import { useConsumedSearchToken } from '@/shared/hooks/useConsumedSearchToken/index.ts';
import { CheckCircle2, Loader2, XCircle } from '@/shared/icons/index.ts';
import { switchToOrganization } from '@/shared/tenancy/switch.ts';

import {
  ACCEPT_INVITE_REDIRECT_MS,
  ACCEPT_INVITE_TEST_IDS,
  AUTH_KEYS,
  AUTH_NS,
} from './accept-invite.constants.ts';

type Status = 'accepting' | 'success' | 'error';

export function AcceptInvitePage() {
  const { t } = useTranslation(AUTH_NS);
  const { invitationId } = useParams({ strict: false });
  const invitationToken = useConsumedSearchToken();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('accepting');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!invitationId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        if (!invitationToken) {
          setError(t(AUTH_KEYS.acceptInvite.errors.invalidOrExpired));
          setStatus('error');
          return;
        }
        // Accepting requires a signed-in session whose email matches the
        // invite — and the email recipient is usually NOT signed in yet. Send
        // them to login first, carrying this page (token included) as the
        // post-login redirect, instead of firing a doomed accept that renders
        // an "Invitation problem: Unauthorized" card for the happy path.
        if (!getAccessToken()) {
          void navigate({
            to: '/login',
            search: {
              redirect: `/accept-invite/${invitationId}?token=${encodeURIComponent(invitationToken)}`,
            },
            replace: true,
          });
          return;
        }
        const accepted = await acceptInvitation(invitationId, invitationToken);

        try {
          const ctx = await switchToOrganization(accepted.organizationId);
          await silentRefresh();
          setStatus('success');
          captureAnalyticsEvent(ANALYTICS_EVENTS.inviteAccepted, {
            invitation_id: invitationId,
            organization_id: accepted.organizationId,
          });
          setTimeout(() => {
            const slug = ctx?.activeOrganization?.slug ?? accepted.organizationSlug;
            if (slug) {
              void navigate({
                ...organizationDashboard(slug),
                replace: true,
              });
            } else {
              void navigate({ to: '/', replace: true });
            }
          }, ACCEPT_INVITE_REDIRECT_MS);
        } catch {
          setStatus('success');
          setTimeout(
            () => void navigate({ to: '/login', replace: true }),
            ACCEPT_INVITE_REDIRECT_MS,
          );
        }
      } catch (err) {
        // A 401 here means the session died between boot and accept — the
        // invitation itself is fine, so recover through login, not the card.
        if (err instanceof HttpError && err.status === 401) {
          void navigate({
            to: '/login',
            search: {
              redirect: `/accept-invite/${invitationId}?token=${encodeURIComponent(invitationToken)}`,
            },
            replace: true,
          });
          return;
        }
        setError(mapFrontendError(err));
        setStatus('error');
      }
    })();
  }, [invitationId, invitationToken, navigate, t]);

  if (!invitationId) {
    return null;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      data-testid={ACCEPT_INVITE_TEST_IDS.page}
    >
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            {status === 'error'
              ? t(AUTH_KEYS.acceptInvite.problemTitle)
              : t(AUTH_KEYS.acceptInvite.joiningTitle)}
          </CardTitle>
          <CardDescription>
            {status === 'accepting' && t(AUTH_KEYS.acceptInvite.accepting)}
            {status === 'success' && t(AUTH_KEYS.acceptInvite.success)}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'accepting' && (
            <Loader2
              className="text-muted-foreground h-10 w-10 animate-spin"
              data-testid={ACCEPT_INVITE_TEST_IDS.loading}
            />
          )}
          {status === 'success' && (
            <CheckCircle2
              className="text-success h-10 w-10"
              data-testid={ACCEPT_INVITE_TEST_IDS.success}
            />
          )}
          {status === 'error' && (
            <>
              <XCircle
                className="text-destructive h-10 w-10"
                data-testid={ACCEPT_INVITE_TEST_IDS.error}
              />
              <Button asChild data-testid={ACCEPT_INVITE_TEST_IDS.login}>
                <Link to="/login">{t(AUTH_KEYS.common.goToSignIn)}</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
