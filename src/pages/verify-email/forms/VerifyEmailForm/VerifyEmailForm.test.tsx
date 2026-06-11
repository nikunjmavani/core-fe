import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { VerifyEmailForm } from './VerifyEmailForm.tsx';

describe('VerifyEmailForm', () => {
  it('renders the verification form', async () => {
    renderWithProviders(<VerifyEmailForm />);
    expect(await screen.findByTestId('verify-email-form')).toBeInTheDocument();
  });
});
