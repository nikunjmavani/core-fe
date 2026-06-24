import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
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
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.setState({
    organizationId: 'org_acme',
    organizationType: value ? 'TEAM' : 'PERSONAL',
    permissions: value ? ['membership:manage'] : [],
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
    expect(screen.queryByTestId('org-logo-upload')).not.toBeInTheDocument();
  });

  it('uploads a logo as a data URL (FE-33)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationGeneralPanel />);
    await screen.findByTestId('org-logo-preview');
    const file = new File(['logo-bytes'], 'logo.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('org-logo-input'), file);
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        'org_acme',
        expect.objectContaining({ logoUrl: expect.stringContaining('data:image/png') }),
      ),
    );
  });

  it('removes an existing logo (FE-33)', async () => {
    listMock.mockResolvedValue([
      {
        id: 'org_acme',
        name: 'Acme Inc.',
        slug: 'acme',
        status: 'active',
        logoUrl: 'data:image/png;base64,AAAA',
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<OrganizationGeneralPanel />);
    const remove = await screen.findByTestId('org-logo-remove');
    await user.click(remove);
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith('org_acme', { logoUrl: null }),
    );
  });
});
