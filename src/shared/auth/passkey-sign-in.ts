import { AppError } from '@/shared/errors/AppError.ts';
import { FRONTEND_ERROR_CODES } from '@/shared/errors/frontend-error-codes.ts';

function assertPasskeySupported(): void {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new AppError(
      FRONTEND_ERROR_CODES.AUTH_PASSKEY_CANCELLED,
      400,
      'Passkeys are not supported in this browser.',
    );
  }
}

/**
 * First-factor passkey sign-in on `/login`.
 * Live: requires core-be `/auth/webauthn/login/*` (not yet wired from the FE).
 */
export async function signInWithPasskey(): Promise<void> {
  assertPasskeySupported();

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      timeout: 120_000,
      userVerification: 'preferred',
      rpId: window.location.hostname || 'localhost',
    },
  });

  if (!credential) {
    throw new AppError(
      FRONTEND_ERROR_CODES.AUTH_PASSKEY_CANCELLED,
      400,
      FRONTEND_ERROR_CODES.AUTH_PASSKEY_CANCELLED,
    );
  }

  throw new AppError(
    'Passkey sign-in requires a configured backend.',
    501,
    FRONTEND_ERROR_CODES.AUTH_PASSKEY_CANCELLED,
  );
}
