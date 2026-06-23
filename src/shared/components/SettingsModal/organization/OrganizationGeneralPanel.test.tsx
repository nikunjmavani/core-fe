import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { listMock, updateMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  updateMock: vi.fn(),
}));
vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, listMyOrganizations: listMock, updateOrganization: updateMock };
});
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { OrganizationGeneralPanel } from './OrganizationGeneralPanel.tsx';

function setCanManage(value: boolean) {
  useOrganizationStore.setState({
    organizationId: 'org_acme',
    capabilities: {
      canInviteMembers: value,
      canManageMembers: value,
      canManageRoles: value,
      canTransferOwnership: value,
      canDelete: value,
      canManageBilling: value,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([
    { id: 'org_acme', name: 'Acme Inc.', slug: 'acme', status: 'active' },
  ]);
  updateMock.mockResolvedValue({
    id: 'org_acme',
    name: 'Acme Co.',
    slug: 'acme',
    status: 'active',
  });
  setCanManage(true);
});

describe('OrganizationGeneralPanel', () => {
  it('renders the org name + read-only slug', async () => {
    renderWithProviders(<OrganizationGeneralPanel />);
    expect(await screen.findByTestId('settings-section-org-general')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('org-name')).toHaveValue('Acme Inc.'));
    expect(screen.getByTestId('org-slug')).toHaveValue('acme');
  });

  it('saves a renamed organization', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationGeneralPanel />);
    await waitFor(() => expect(screen.getByTestId('org-name')).toHaveValue('Acme Inc.'));
    const input = screen.getByTestId('org-name');
    await user.clear(input);
    await user.type(input, 'Acme Co.');
    await user.click(screen.getByTestId('org-general-save'));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith('org_acme', { name: 'Acme Co.' }),
    );
  });

  it('disables editing without the manage capability', async () => {
    setCanManage(false);
    renderWithProviders(<OrganizationGeneralPanel />);
    await waitFor(() => expect(screen.getByTestId('org-name')).toBeDisabled());
    expect(screen.queryByTestId('org-general-save')).not.toBeInTheDocument();
  });
});
