import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { HeatCell } from '../../dashboard.contracts.ts';
import { ActivityHeatmap } from './ActivityHeatmap.tsx';

function buildCells(days: number): HeatCell[] {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { date: d.toISOString().slice(0, 10), count: i % 5 };
  });
}

describe('ActivityHeatmap', () => {
  it('renders a loading skeleton while pending', () => {
    render(<ActivityHeatmap isLoading />);
    expect(screen.getByTestId('activity-heatmap-loading')).toBeInTheDocument();
  });

  it('renders the contribution grid as an accessible image', () => {
    render(<ActivityHeatmap data={buildCells(70)} isLoading={false} />);
    const grid = screen.getByTestId('activity-heatmap-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('role', 'img');
    expect(grid.getAttribute('aria-label')).toMatch(/events over the last \d+ weeks/);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ActivityHeatmap data={buildCells(70)} isLoading={false} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
