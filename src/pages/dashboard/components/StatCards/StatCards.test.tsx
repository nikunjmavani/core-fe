import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { DashboardStat } from '../../dashboard.contracts.ts';
import { StatCards } from './StatCards.tsx';

const STATS: DashboardStat[] = [
  {
    id: 'users',
    title: 'Total Users',
    value: '3,200',
    valueRaw: 3200,
    prefix: '',
    change: '+12.0%',
    trend: 'up',
    description: 'vs last month',
    spark: [2300, 2600, 2900, 3200],
  },
  {
    id: 'revenue',
    title: 'Monthly Revenue',
    value: '$80,000',
    valueRaw: 80000,
    prefix: '$',
    change: '-3.0%',
    trend: 'down',
    description: 'vs last month',
    spark: [90000, 86000, 82000, 80000],
  },
];

describe('StatCards', () => {
  it('renders a skeleton grid while loading', () => {
    render(<StatCards isLoading />);
    expect(screen.getByTestId('dashboard-stat-cards')).toBeInTheDocument();
    expect(screen.queryByTestId('stat-card-users')).not.toBeInTheDocument();
  });

  it('renders a card, animated value and sparkline per stat', () => {
    render(<StatCards stats={STATS} isLoading={false} />);
    expect(screen.getByTestId('stat-card-users')).toBeInTheDocument();
    expect(screen.getByTestId('stat-value-users')).toBeInTheDocument();
    expect(screen.getByTestId('sparkline-users')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('+12.0%')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StatCards stats={STATS} isLoading={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
