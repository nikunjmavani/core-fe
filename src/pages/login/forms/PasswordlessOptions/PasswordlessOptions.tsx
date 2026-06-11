import { useNavigate } from '@tanstack/react-router';
import { Fingerprint, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { API_BASE_PATH, API_ENDPOINTS } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { performMockLogin } from '@/shared/auth/mock-auth.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';

/**
 * Passwordless / social sign-in options: Google OAuth, passkey (WebAuthn), and
 * magic link. In mock mode each completes a mock login via `/callback`;
 * with a live backend the marked endpoints take over (REPLACE_WITH_API).
 */
export function PasswordlessOptions() {
  const navigate = useNavigate();

  const handleGoogleSignIn = () => {
    // REPLACE_WITH_API: redirect to backend OAuth start; mock returns via /callback
    if (config.useMockApi) {
      void navigate({ to: '/callback' });
      return;
    }
    window.location.href = `${config.apiBaseUrl}${API_BASE_PATH}${API_ENDPOINTS.AUTH.GOOGLE}`;
  };

  const handlePasskey = async () => {
    // REPLACE_WITH_API: navigator.credentials.get() + POST /api/v1/auth/webauthn/login
    if (config.useMockApi) {
      await performMockLogin();
      void navigate({ to: '/', replace: true });
      return;
    }
    toast.error('Passkeys require a configured backend.');
  };

  const handleMagicLink = () => {
    // REPLACE_WITH_API: POST /api/v1/auth/magic-link (sends email)
    toast.success('Magic link sent — check your email.');
    if (config.useMockApi) {
      setTimeout(() => navigate({ to: '/callback' }), 600);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        data-testid="login-google"
      >
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
        Sign in with Google
      </Button>

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
          onClick={handleMagicLink}
          data-testid="login-magic-link"
        >
          <Mail className="mr-2 h-4 w-4" />
          Magic link
        </Button>
      </div>

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
