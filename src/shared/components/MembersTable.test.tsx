import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Member } from '@/shared/api/organization-contracts.ts';

import { renderWithProviders } from '../../../tests/utils/renderWithProviders.tsx';
import { MembersTable } from './MembersTable.tsx';

const MEMBERS: Member[] = [
  {
    id: 'm_1',
    userId: 'u_1',
    name: 'Ada Lovelace',
    email: 'ada@acme.test',
    role: 'owner',
    status: 'active',
    joinedAt: '2025-01-12T09:00:00.000Z',
  },
];

describe('MembersTable', () => {
  it('renders members with search and export', async () => {
    renderWithProviders(<MembersTable members={MEMBERS} />);
    expect(await screen.findByTestId('members-table')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByTestId('members-export')).toBeInTheDocument();
    expect(screen.getByTestId('members-role-filter')).toBeInTheDocument();
  });

  it('shows an empty message when there are no members', async () => {
    renderWithProviders(<MembersTable members={[]} />);
    expect(await screen.findByText('No members found.')).toBeInTheDocument();
  });
});
