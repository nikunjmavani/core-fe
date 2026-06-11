import { MfaForm } from './forms/MfaForm/index.ts';

/**
 * Top-level UI for the `/mfa` route. Thin wrapper that mounts the
 * {@link MfaForm} inside the page boundary and exposes the page-level
 * `data-testid` for E2E selection.
 */
export function MfaPage() {
  return (
    <div data-testid="mfa-page">
      <MfaForm />
    </div>
  );
}
