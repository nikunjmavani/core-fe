import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { DashboardPage } from '../../DashboardPage.tsx';

describe('DashboardPage', () => {
  it('renders the dashboard shell with stat cards and a live activity feed', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-cards')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('activity-live')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-targets')).toBeInTheDocument();
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
  });
});
