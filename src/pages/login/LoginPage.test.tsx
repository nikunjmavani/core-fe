import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { LoginPage } from './LoginPage.tsx';

describe('LoginPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<LoginPage />);
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });
});
