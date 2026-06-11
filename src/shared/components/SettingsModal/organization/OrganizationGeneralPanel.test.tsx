import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OrganizationGeneralPanel } from './OrganizationGeneralPanel.tsx';

vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listMyOrganizations: vi
      .fn()
      .mockResolvedValue([{ id: 'org_acme', name: 'Acme Inc.', slug: 'acme' }]),
  };
});

describe('OrganizationGeneralPanel', () => {
  it('renders the organization form fields', async () => {
    renderWithProviders(<OrganizationGeneralPanel />);
    expect(await screen.findByTestId('settings-section-org-general')).toBeInTheDocument();
    expect(screen.getByTestId('org-name')).toBeInTheDocument();
  });
});
