import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { MfaPage } from './MfaPage.tsx';

describe('MfaPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<MfaPage />);
    expect(await screen.findByTestId('mfa-page')).toBeInTheDocument();
  });
});
