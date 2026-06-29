import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./AnalyticsChart/index.ts', () => ({
  AnalyticsChart: () => <div data-testid="analytics-chart-stub" />,
}));
vi.mock('./MembersTable/index.ts', () => ({
  MembersTable: () => <div data-testid="members-table-stub" />,
}));
vi.mock('@/shared/components/ThemeShowcase/index.ts', () => ({
  ThemeShowcase: () => <div data-testid="theme-showcase-stub" />,
}));

import { DeferredAnalyticsChart, DeferredThemeShowcase } from './Dashboard.deferred.tsx';

describe('Dashboard.deferred', () => {
  it('lazy-loads analytics chart', async () => {
    render(<DeferredAnalyticsChart />);
    expect(await screen.findByTestId('analytics-chart-stub')).toBeInTheDocument();
  });

  it('lazy-loads theme showcase', async () => {
    render(<DeferredThemeShowcase />);
    expect(await screen.findByTestId('theme-showcase-stub')).toBeInTheDocument();
  });
});
