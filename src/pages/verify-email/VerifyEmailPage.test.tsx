import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { VerifyEmailPage } from './VerifyEmailPage.tsx';

describe('VerifyEmailPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<VerifyEmailPage />);
    expect(await screen.findByTestId('verify-email-page')).toBeInTheDocument();
  });
});
