import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import type { ActivityItem } from '../../dashboard.contracts.ts';
import { ActivityFeed } from './ActivityFeed.tsx';

const SEED: ActivityItem[] = [
  {
    id: 'act_1',
    user: 'Ada Lovelace',
    action: 'created organization',
    target: 'Acme Corp',
    time: '2 minutes ago',
    type: 'create',
  },
];

describe('ActivityFeed', () => {
  it('renders a loading skeleton while pending', async () => {
    renderWithProviders(<ActivityFeed isLoading />);
    expect(await screen.findByTestId('activity-feed-loading')).toBeInTheDocument();
  });

  it('renders the seeded events', async () => {
    renderWithProviders(<ActivityFeed seed={SEED} isLoading={false} />);
    expect(await screen.findByTestId('activity-feed')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(
      <ActivityFeed seed={SEED} isLoading={false} />,
    );
    await screen.findByTestId('activity-feed');
    expect(await axe(container)).toHaveNoViolations();
  });
});
