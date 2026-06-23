import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const { useApiKeysMock, revokeMutateAsync } = vi.hoisted(() => ({
  useApiKeysMock: vi.fn(),
  revokeMutateAsync: vi.fn(),
}));
vi.mock('@/shared/hooks/useApiKeys/index.ts', () => ({
  useApiKeys: useApiKeysMock,
  useRevokeApiKey: () => ({ mutateAsync: revokeMutateAsync }),
}));

import { OrganizationIntegrationsPanel } from './OrganizationIntegrationsPanel.tsx';

const KEY = {
  id: 'key_1',
  name: 'CI deploy key',
  prefix: 'sk_live_abc',
  createdAt: '2026-01-15T00:00:00.000Z',
};

function setCanManage(value: boolean) {
  useOrganizationStore.setState({
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
  revokeMutateAsync.mockResolvedValue(undefined);
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationIntegrationsPanel', () => {
  it('shows an empty state when there are no keys', () => {
    useApiKeysMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists keys with a revoke control when the org has the capability', () => {
    useApiKeysMock.mockReturnValue({ data: [KEY], isLoading: false, isError: false });
    setCanManage(true);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByText('CI deploy key')).toBeInTheDocument();
    expect(screen.getByTestId('apikey-revoke-key_1')).toBeInTheDocument();
  });

  it('hides the revoke control without the capability (e.g. a personal org)', () => {
    useApiKeysMock.mockReturnValue({ data: [KEY], isLoading: false, isError: false });
    setCanManage(false);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByText('CI deploy key')).toBeInTheDocument();
    expect(screen.queryByTestId('apikey-revoke-key_1')).not.toBeInTheDocument();
  });

  it('confirms and revokes a key', async () => {
    useApiKeysMock.mockReturnValue({ data: [KEY], isLoading: false, isError: false });
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationIntegrationsPanel />);

    await user.click(screen.getByTestId('apikey-revoke-key_1'));
    await user.click(screen.getByTestId('confirm-accept'));

    await waitFor(() => expect(revokeMutateAsync).toHaveBeenCalledWith('key_1'));
  });
});
