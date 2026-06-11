import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { DashboardPage } from './DashboardPage.tsx';

describe('DashboardPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
  });
});
