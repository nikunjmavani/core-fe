import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OrganizationPickerPage } from './OrganizationPickerPage.tsx';

vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listMyOrganizations: vi
      .fn()
      .mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]),
  };
});

describe('OrganizationPickerPage', () => {
  it('lists the organizations to pick from', async () => {
    renderWithProviders(<OrganizationPickerPage />);
    expect(await screen.findByTestId('organization-page')).toBeInTheDocument();
    expect(
      await screen.findByTestId('organization-picker-option-acme'),
    ).toBeInTheDocument();
  });
});
