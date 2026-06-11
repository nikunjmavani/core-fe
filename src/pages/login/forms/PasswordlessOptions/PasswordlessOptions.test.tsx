import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { PasswordlessOptions } from './PasswordlessOptions.tsx';

describe('PasswordlessOptions', () => {
  it('renders the Google, passkey, and magic-link options', async () => {
    renderWithProviders(<PasswordlessOptions />);
    expect(await screen.findByTestId('login-google')).toBeInTheDocument();
    expect(screen.getByTestId('login-passkey')).toBeInTheDocument();
    expect(screen.getByTestId('login-magic-link')).toBeInTheDocument();
  });
});
