import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MeContext, OrganizationType } from '@/shared/tenancy/me-context.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OrganizationSwitcher } from './OrganizationSwitcher.tsx';

const { useMeContextMock, switchToPersonalMock } = vi.hoisted(() => ({
  useMeContextMock: vi.fn(),
  switchToPersonalMock: vi.fn(),
}));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
  meContextQueryKey: ['auth', 'me-context'],
}));
vi.mock('@/shared/tenancy/switch.ts', () => ({
  switchToPersonal: switchToPersonalMock,
  switchToOrganization: vi.fn(),
}));

function org(id: string, name: string, slug: string | null, type: OrganizationType) {
  return {
    id,
    name,
    slug,
    type,
    status: 'ACTIVE' as const,
    logoUrl: null,
    createdAt: 't',
    updatedAt: 't',
  };
}

const ACME = org('org_acme', 'Acme Inc.', 'acme', 'TEAM');
const PERSONAL = org('org_personal', 'Personal', null, 'PERSONAL');
const CTX = {
  activeOrganization: ACME,
  organizations: [
    { ...ACME, isActive: true },
    { ...PERSONAL, isActive: false },
  ],
} as unknown as MeContext;

beforeEach(() => {
  vi.clearAllMocks();
  switchToPersonalMock.mockResolvedValue(undefined);
  useMeContextMock.mockReturnValue({ data: CTX, isLoading: false });
});

describe('OrganizationSwitcher', () => {
  it('shows the active organization name', async () => {
    renderWithProviders(<OrganizationSwitcher />);
    expect(await screen.findByText('Acme Inc.')).toBeInTheDocument();
  });

  it('lists every organization (incl. personal) plus the create action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSwitcher />);
    await user.click(await screen.findByTestId('organization-switcher-trigger'));
    expect(
      await screen.findByTestId('organization-switcher-option-personal'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('organization-switcher-create')).toBeInTheDocument();
  });

  it('switching to the personal org calls switchToPersonal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSwitcher />);
    await user.click(await screen.findByTestId('organization-switcher-trigger'));
    await user.click(await screen.findByTestId('organization-switcher-option-personal'));
    await waitFor(() => expect(switchToPersonalMock).toHaveBeenCalledTimes(1));
  });
});
