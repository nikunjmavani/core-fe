import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { MembersTable } from './MembersTable.tsx';

describe('MembersTable', () => {
  it('renders the roster with member names, emails, and roles', async () => {
    renderWithProviders(<MembersTable />);

    expect(await screen.findByTestId('dashboard-members-table')).toBeInTheDocument();
    expect(screen.getByText('Ava Chen')).toBeInTheDocument();
    expect(screen.getByText('ava.chen@acme.test')).toBeInTheDocument();
    expect(screen.getByText('Marcus Boateng')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<MembersTable />);
    await screen.findByTestId('dashboard-members-table');
    expect(await axe(container)).toHaveNoViolations();
  });
});
