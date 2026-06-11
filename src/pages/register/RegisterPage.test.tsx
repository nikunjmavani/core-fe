import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { RegisterPage } from './RegisterPage.tsx';

describe('RegisterPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<RegisterPage />);
    expect(await screen.findByTestId('register-page')).toBeInTheDocument();
  });
});
