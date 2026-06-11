import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { ForgotPasswordPage } from './ForgotPasswordPage.tsx';

describe('ForgotPasswordPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(await screen.findByTestId('forgot-password-page')).toBeInTheDocument();
  });
});
