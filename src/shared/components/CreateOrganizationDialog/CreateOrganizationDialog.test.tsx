import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { CreateOrganizationDialog } from './CreateOrganizationDialog.tsx';

const navigateMock = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/shared/tenancy/my-organizations.ts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createOrganization: vi
      .fn()
      .mockResolvedValue({ id: 'org_new', name: 'New Org', slug: 'new-org' }),
  };
});

describe('CreateOrganizationDialog', () => {
  it('creates the organization and navigates to its dashboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateOrganizationDialog open onOpenChange={() => {}} />);

    await user.type(
      await screen.findByTestId('create-organization-dialog-name'),
      'New Org',
    );
    await user.click(screen.getByTestId('create-organization-dialog-submit'));

    await vi.waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/organization/$organizationSlug/dashboard',
          params: { organizationSlug: 'new-org' },
        }),
      );
    });
  });
});
