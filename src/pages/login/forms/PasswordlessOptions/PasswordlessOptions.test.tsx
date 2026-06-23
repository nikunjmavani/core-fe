import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/shared/api/auth-api.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { PasswordlessOptions } from './PasswordlessOptions.tsx';

// establishSession runs real token/profile work — stub it so the verify path is
// observable without a backend.
const { establishSessionMock } = vi.hoisted(() => ({
  establishSessionMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/auth/service.ts', () => ({
  establishSession: establishSessionMock,
}));

describe('PasswordlessOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders a button per configured provider plus passkey and magic-link', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue(['google', 'github']);
    renderWithProviders(<PasswordlessOptions />);

    expect(await screen.findByTestId('login-oauth-google')).toBeInTheDocument();
    expect(await screen.findByTestId('login-oauth-github')).toBeInTheDocument();
    expect(screen.getByTestId('login-passkey')).toBeInTheDocument();
    expect(screen.getByTestId('login-magic-link')).toBeInTheDocument();
  });

  it('sends a 6-digit sign-in code to the entered email', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue([]);
    const send = vi.spyOn(authApi, 'magicLinkSend').mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<PasswordlessOptions />);

    await user.click(await screen.findByTestId('login-magic-link'));
    await user.type(await screen.findByTestId('magic-link-email'), 'ada@acme.test');
    await user.click(screen.getByTestId('magic-link-send'));

    await waitFor(() => expect(send).toHaveBeenCalledWith('ada@acme.test'));
  });

  it('advances to code entry and verifies the code with { email, code }', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue([]);
    vi.spyOn(authApi, 'magicLinkSend').mockResolvedValue();
    const verify = vi
      .spyOn(authApi, 'magicLinkVerify')
      .mockResolvedValue({ accessToken: 'acc_tok' });
    const user = userEvent.setup();
    renderWithProviders(<PasswordlessOptions />);

    await user.click(await screen.findByTestId('login-magic-link'));
    await user.type(await screen.findByTestId('magic-link-email'), 'ada@acme.test');
    await user.click(screen.getByTestId('magic-link-send'));

    // Code panel appears (whether or not the account exists — no enumeration).
    const codeInput = await screen.findByTestId('magic-link-code');
    await user.type(codeInput, '123456');
    await user.click(screen.getByTestId('magic-link-verify'));

    await waitFor(() =>
      expect(verify).toHaveBeenCalledWith({ email: 'ada@acme.test', code: '123456' }),
    );
    expect(establishSessionMock).toHaveBeenCalledWith('acc_tok');
  });

  it('strips non-digits and caps the code at 6 characters', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue([]);
    vi.spyOn(authApi, 'magicLinkSend').mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<PasswordlessOptions />);

    await user.click(await screen.findByTestId('login-magic-link'));
    await user.type(await screen.findByTestId('magic-link-email'), 'ada@acme.test');
    await user.click(screen.getByTestId('magic-link-send'));

    const codeInput = await screen.findByTestId<HTMLInputElement>('magic-link-code');
    await user.type(codeInput, 'a1b2c3d4e5');
    expect(codeInput.value).toBe('12345');
  });
});
