import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OrganizationSwitcher } from './OrganizationSwitcher.tsx';

// Partial mock: the embedded CreateOrganizationDialog needs the real schemas.
vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listMyOrganizations: vi.fn().mockResolvedValue([
      { id: 'org_acme', name: 'Acme Inc.', slug: 'acme' },
      { id: 'org_globex', name: 'Globex', slug: 'globex' },
    ]),
  };
});

describe('OrganizationSwitcher', () => {
  beforeEach(() => {
    useOrganizationStore.getState().clearOrganization();
  });

  it('shows the active organization name once loaded', async () => {
    useOrganizationStore.getState().setOrganization('org_acme', 'acme');
    renderWithProviders(<OrganizationSwitcher />);
    expect(await screen.findByText('Acme Inc.')).toBeInTheDocument();
  });

  it('lists every organization plus the create action in the menu', async () => {
    useOrganizationStore.getState().setOrganization('org_acme', 'acme');
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSwitcher />);

    await user.click(await screen.findByTestId('organization-switcher-trigger'));

    expect(
      await screen.findByTestId('organization-switcher-option-globex'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('organization-switcher-create')).toBeInTheDocument();
  });
});
