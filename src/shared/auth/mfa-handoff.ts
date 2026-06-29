const MFA_SESSION_TOKEN_KEY = 'core-fe:mfa-session-token';
const MFA_REDIRECT_KEY = 'core-fe:mfa-redirect';

/** Persists the short-lived MFA session token across the `/login` → `/mfa` navigation. */
export function stashMfaHandoff(mfaSessionToken: string, redirect?: string): void {
  try {
    sessionStorage.setItem(MFA_SESSION_TOKEN_KEY, mfaSessionToken);
    if (redirect) sessionStorage.setItem(MFA_REDIRECT_KEY, redirect);
    else sessionStorage.removeItem(MFA_REDIRECT_KEY);
  } catch {
    // sessionStorage unavailable — caller still navigates; MfaForm shows session expired.
  }
}

export function readMfaHandoff(): { mfaSessionToken: string; redirect?: string } {
  try {
    const mfaSessionToken = sessionStorage.getItem(MFA_SESSION_TOKEN_KEY) ?? '';
    const redirect = sessionStorage.getItem(MFA_REDIRECT_KEY) ?? undefined;
    return { mfaSessionToken, redirect };
  } catch {
    return { mfaSessionToken: '' };
  }
}

export function clearMfaHandoff(): void {
  try {
    sessionStorage.removeItem(MFA_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(MFA_REDIRECT_KEY);
  } catch {
    // ignore
  }
}
