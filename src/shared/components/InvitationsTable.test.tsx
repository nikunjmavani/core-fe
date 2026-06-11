import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Invitation } from '@/shared/api/organization-contracts.ts';

import { renderWithProviders } from '../../../tests/utils/renderWithProviders.tsx';
import { InvitationsTable } from './InvitationsTable.tsx';

const INVITATIONS: Invitation[] = [
  {
    id: 'inv_1',
    email: 'linus@acme.test',
    role: 'member',
    status: 'pending',
    invitedByName: 'Ada',
    createdAt: '2026-05-26T10:00:00.000Z',
    expiresAt: '2026-06-02T10:00:00.000Z',
  },
];

describe('InvitationsTable', () => {
  it('renders invitations', async () => {
    renderWithProviders(<InvitationsTable invitations={INVITATIONS} />);
    expect(await screen.findByTestId('invitations-table')).toBeInTheDocument();
    expect(screen.getByText('linus@acme.test')).toBeInTheDocument();
  });

  it('shows an empty message when there are none', async () => {
    renderWithProviders(<InvitationsTable invitations={[]} />);
    expect(await screen.findByText('No invitations.')).toBeInTheDocument();
  });
});
