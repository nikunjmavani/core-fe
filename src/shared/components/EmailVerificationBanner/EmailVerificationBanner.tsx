import { useState } from 'react';

import { authApi } from '@/shared/api/auth-api.ts';
import { getAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { Mail } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';

function resendLabel(sending: boolean, sent: boolean): string {
  if (sent) return 'Sent';
  if (sending) return 'Sending…';
  return 'Resend email';
}

/**
 * App-shell banner shown when the signed-in user's email is not yet verified.
 * Offers a one-tap resend (`POST /auth/email/resend-verification`). Renders
 * nothing once verified — or while the session context is still loading.
 */
export function EmailVerificationBanner() {
  const { data } = useMeContext();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!data || data.user.isEmailVerified) return null;

  const resend = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSending(true);
    try {
      await authApi.resendVerification(token);
      setSent(true);
      notify.success('Verification email sent — check your inbox.');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not resend the email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="status"
      data-testid="email-verify-banner"
      className="bg-muted/60 flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2 text-sm sm:px-6"
    >
      <Mail className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-foreground">Verify your email to secure your account.</span>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto h-7"
        disabled={sending || sent}
        onClick={resend}
        data-testid="email-verify-resend"
      >
        {resendLabel(sending, sent)}
      </Button>
    </div>
  );
}
