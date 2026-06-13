import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OrganizationPickerPage } from './OrganizationPickerPage.tsx';

vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, listMyOrganizations: vi.fn() };
});

const listMock = vi.mocked(listMyOrganizations);

describe('OrganizationPickerPage', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('lists the organizations to pick from', async () => {
    listMock.mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]);
    renderWithProviders(<OrganizationPickerPage />);

    expect(await screen.findByTestId('organization-page')).toBeInTheDocument();
    expect(
      await screen.findByTestId('organization-picker-option-acme'),
    ).toBeInTheDocument();
  });

  it('shows an error state with a retry when the fetch fails', async () => {
    listMock.mockRejectedValue(new Error('network down'));
    renderWithProviders(<OrganizationPickerPage />);

    expect(await screen.findByTestId('organization-picker-error')).toBeInTheDocument();
    expect(screen.getByTestId('organization-picker-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('organization-picker-empty')).not.toBeInTheDocument();
  });

  it('shows an empty state when the user has no organizations', async () => {
    listMock.mockResolvedValue([]);
    renderWithProviders(<OrganizationPickerPage />);

    expect(await screen.findByTestId('organization-picker-empty')).toBeInTheDocument();
    // The create affordance is always available to escape the empty state.
    expect(screen.getByTestId('organization-picker-create')).toBeInTheDocument();
  });
});
