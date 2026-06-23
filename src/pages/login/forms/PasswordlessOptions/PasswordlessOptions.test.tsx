import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/shared/api/auth-api.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { PasswordlessOptions } from './PasswordlessOptions.tsx';

describe('PasswordlessOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a button per configured provider plus passkey and magic-link', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue(['google', 'github']);
    renderWithProviders(<PasswordlessOptions />);

    expect(await screen.findByTestId('login-oauth-google')).toBeInTheDocument();
    expect(await screen.findByTestId('login-oauth-github')).toBeInTheDocument();
    expect(screen.getByTestId('login-passkey')).toBeInTheDocument();
    expect(screen.getByTestId('login-magic-link')).toBeInTheDocument();
  });

  it('sends a magic link to the entered email', async () => {
    vi.spyOn(authApi, 'listOAuthProviders').mockResolvedValue([]);
    const send = vi.spyOn(authApi, 'magicLinkSend').mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<PasswordlessOptions />);

    await user.click(await screen.findByTestId('login-magic-link'));
    await user.type(await screen.findByTestId('magic-link-email'), 'ada@acme.test');
    await user.click(screen.getByTestId('magic-link-send'));

    await waitFor(() => expect(send).toHaveBeenCalledWith('ada@acme.test'));
  });
});
