import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { ResetPasswordPage } from './ResetPasswordPage.tsx';

describe('ResetPasswordPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<ResetPasswordPage />);
    expect(await screen.findByTestId('reset-password-page')).toBeInTheDocument();
  });
});
