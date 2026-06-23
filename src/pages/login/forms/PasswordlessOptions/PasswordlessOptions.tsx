import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { authApi } from '@/shared/api/auth-api.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { Fingerprint, Github, Mail } from '@/shared/icons/index.ts';

function providerLabel(provider: string): string {
  if (provider === 'google') return 'Google';
  if (provider === 'github') return 'GitHub';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function GoogleMark() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') return <GoogleMark />;
  if (provider === 'github') return <Github className="mr-2 h-4 w-4" />;
  return null;
}

/**
 * Passwordless / social sign-in options. The OAuth providers are discovered from
 * the backend (`GET /auth/oauth/providers`) so the buttons reflect what's actually
 * configured; magic-link sends a sign-in code by email. In mock mode the provider
 * list and passkey complete a mock login via `/callback`.
 */
export function PasswordlessOptions() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<string[]>([]);
  const [magicMode, setMagicMode] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    authApi
      .listOAuthProviders()
      .then((list) => {
        if (active) setProviders(list);
      })
      .catch(() => {
        /* discovery is best-effort; no providers → no social buttons */
      });
    return () => {
      active = false;
    };
  }, []);

  const startOAuth = (provider: string) => {
    if (config.useMockApi) {
      void navigate({ to: '/callback' });
      return;
    }
    // Full-page navigation: the backend redirects to the provider, then back to /callback.
    window.location.assign(`${config.apiBaseUrl}${API_BASE_PATH}/auth/oauth/${provider}`);
  };

  const handlePasskey = async () => {
    // REPLACE_WITH_API: navigator.credentials.get() + POST /api/v1/auth/webauthn/authenticate
    if (config.useMockApi) {
      await performMockLogin();
      void navigate({ to: '/', replace: true });
      return;
    }
    toast.error('Passkeys require a configured backend.');
  };

  const sendMagicLink = async () => {
    const email = magicEmail.trim();
    if (!email) return;
    setSending(true);
    try {
      await authApi.magicLinkSend(email);
      // Uniform message — never reveals whether the account exists.
      toast.success('If an account exists, a sign-in link is on its way.');
      setMagicMode(false);
      setMagicEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => startOAuth(provider)}
          data-testid={`login-oauth-${provider}`}
        >
          <ProviderIcon provider={provider} />
          Sign in with {providerLabel(provider)}
        </Button>
      ))}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePasskey}
          data-testid="login-passkey"
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          Passkey
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMagicMode((v) => !v)}
          aria-expanded={magicMode}
          data-testid="login-magic-link"
        >
          <Mail className="mr-2 h-4 w-4" />
          Magic link
        </Button>
      </div>

      {magicMode && (
        <div className="space-y-2" data-testid="magic-link-panel">
          <Input
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            aria-label="Email for the magic sign-in link"
            data-testid="magic-link-email"
          />
          <Button
            type="button"
            className="w-full"
            disabled={sending || magicEmail.trim().length === 0}
            onClick={sendMagicLink}
            data-testid="magic-link-send"
          >
            {sending ? 'Sending…' : 'Send sign-in link'}
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}
