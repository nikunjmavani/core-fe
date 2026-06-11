import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { Goal } from '../../dashboard.contracts.ts';
import { MonthlyTargets } from './MonthlyTargets.tsx';

const GOALS: Goal[] = [
  {
    id: 'revenue',
    label: 'Revenue target',
    current: 75000,
    target: 100000,
    unit: 'currency',
  },
  { id: 'signups', label: 'New signups', current: 600, target: 1000, unit: 'count' },
  { id: 'retention', label: 'Retention rate', current: 90, target: 95, unit: 'percent' },
];

describe('MonthlyTargets', () => {
  it('renders loading skeletons while pending', () => {
    render(<MonthlyTargets isLoading />);
    expect(screen.getByTestId('targets-loading')).toBeInTheDocument();
  });

  it('renders the radial gauge percent and progress rows', () => {
    render(<MonthlyTargets goals={GOALS} isLoading={false} />);
    expect(screen.getByTestId('targets-gauge-percent')).toHaveTextContent('75%');
    expect(screen.getByTestId('target-row-signups')).toBeInTheDocument();
    expect(screen.getByTestId('target-row-retention')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MonthlyTargets goals={GOALS} isLoading={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
