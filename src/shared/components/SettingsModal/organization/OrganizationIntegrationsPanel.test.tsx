import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

const {
  useApiKeysMock,
  revokeMutateAsync,
  useWebhooksMock,
  createWebhookMutate,
  deleteWebhookMutateAsync,
} = vi.hoisted(() => ({
  useApiKeysMock: vi.fn(),
  revokeMutateAsync: vi.fn(),
  useWebhooksMock: vi.fn(),
  createWebhookMutate: vi.fn(),
  deleteWebhookMutateAsync: vi.fn(),
}));
vi.mock('@/shared/hooks/useApiKeys/index.ts', () => ({
  useApiKeys: useApiKeysMock,
  useRevokeApiKey: () => ({ mutateAsync: revokeMutateAsync }),
}));
vi.mock('@/shared/hooks/useWebhooks/index.ts', () => ({
  useWebhooks: useWebhooksMock,
  useCreateWebhook: () => ({ mutate: createWebhookMutate, isPending: false }),
  useDeleteWebhook: () => ({ mutateAsync: deleteWebhookMutateAsync }),
}));

import { OrganizationIntegrationsPanel } from './OrganizationIntegrationsPanel.tsx';

const KEY = {
  id: 'key_1',
  name: 'CI deploy key',
  prefix: 'sk_live_abc',
  createdAt: '2026-01-15T00:00:00.000Z',
};
const WEBHOOK = {
  id: 'whk_1',
  url: 'https://x.test/hook',
  events: ['member.created'],
  active: true,
  createdAt: '2026-06-01T00:00:00.000Z',
};

function setCanManage(value: boolean) {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.setState({
    organizationType: value ? 'TEAM' : 'PERSONAL',
    permissions: value ? ['role:manage'] : [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  revokeMutateAsync.mockResolvedValue(undefined);
  deleteWebhookMutateAsync.mockResolvedValue(undefined);
  useApiKeysMock.mockReturnValue({ data: [KEY], isLoading: false, isError: false });
  useWebhooksMock.mockReturnValue({ data: [WEBHOOK], isLoading: false, isError: false });
  useOrganizationStore.getState().clearOrganization();
});

describe('OrganizationIntegrationsPanel — API keys', () => {
  it('shows an empty state when there are no keys', () => {
    useApiKeysMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists keys with a revoke control when the user has the permission', () => {
    setCanManage(true);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByText('CI deploy key')).toBeInTheDocument();
    expect(screen.getByTestId('apikey-revoke-key_1')).toBeInTheDocument();
  });

  it('hides the revoke control without the permission', () => {
    setCanManage(false);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.queryByTestId('apikey-revoke-key_1')).not.toBeInTheDocument();
  });

  it('confirms and revokes a key', async () => {
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationIntegrationsPanel />);
    await user.click(screen.getByTestId('apikey-revoke-key_1'));
    await user.click(screen.getByTestId('confirm-accept'));
    await waitFor(() => expect(revokeMutateAsync).toHaveBeenCalledWith('key_1'));
  });
});

describe('OrganizationIntegrationsPanel — webhooks', () => {
  it('lists webhooks with cap-gated controls', () => {
    setCanManage(true);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByText('https://x.test/hook')).toBeInTheDocument();
    expect(screen.getByTestId('webhook-add')).toBeInTheDocument();
    expect(screen.getByTestId('webhook-delete-whk_1')).toBeInTheDocument();
  });

  it('hides webhook controls without the permission', () => {
    setCanManage(false);
    render(<OrganizationIntegrationsPanel />);
    expect(screen.queryByTestId('webhook-add')).not.toBeInTheDocument();
    expect(screen.queryByTestId('webhook-delete-whk_1')).not.toBeInTheDocument();
  });

  it('creates a webhook with a URL + selected event', async () => {
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationIntegrationsPanel />);
    await user.click(screen.getByTestId('webhook-add'));
    await user.type(await screen.findByTestId('webhook-url'), 'https://new.test/hook');
    await user.click(screen.getByTestId('webhook-event-member.created'));
    await user.click(screen.getByTestId('webhook-create'));
    expect(createWebhookMutate).toHaveBeenCalledWith(
      { url: 'https://new.test/hook', events: ['member.created'] },
      expect.anything(),
    );
  });

  it('confirms and deletes a webhook', async () => {
    setCanManage(true);
    const user = userEvent.setup();
    render(<OrganizationIntegrationsPanel />);
    await user.click(screen.getByTestId('webhook-delete-whk_1'));
    await user.click(screen.getByTestId('confirm-accept'));
    await waitFor(() => expect(deleteWebhookMutateAsync).toHaveBeenCalledWith('whk_1'));
  });
});
