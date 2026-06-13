import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));

const createOrganization = vi.fn();
vi.mock('@/shared/tenancy/my-organizations.ts', () => ({
  createOrganization: (...args: unknown[]) => createOrganization(...args),
}));

const createInvitation = vi.fn();
vi.mock('@/shared/api/organization-api.ts', () => ({
  createInvitation: (...args: unknown[]) => createInvitation(...args),
}));

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { updateProfile: vi.fn().mockResolvedValue(undefined) },
}));

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { OnboardingPage } from './OnboardingPage.tsx';

/** Drop the wizard on the final step with a chosen org name + invites. */
function seedDoneStep(invites: string[] = []) {
  const store = useOnboardingStore.getState();
  store.reset();
  store.patch({ organizationName: 'Acme Inc.', invites });
  store.setStepIndex(5); // 'done'
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOrganization.mockResolvedValue({
      id: 'org_new',
      name: 'Acme Inc.',
      slug: 'acme',
    });
    createInvitation.mockResolvedValue({ id: 'inv_1' });
    useOnboardingStore.getState().reset();
  });

  it('renders the page container', async () => {
    renderWithProviders(<OnboardingPage />);
    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
  });

  it('creates the org once and navigates to its dashboard', async () => {
    const user = userEvent.setup();
    seedDoneStep(['a@acme.com']);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).toHaveBeenCalledTimes(1);
    expect(useOnboardingStore.getState().createdOrganizationId).toBe('org_new');
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationId: 'org_new' }, replace: true }),
    );
  });

  it('does NOT re-create the org on a retry after a partial failure', async () => {
    const user = userEvent.setup();
    seedDoneStep(['a@acme.com']);
    // Simulate a prior attempt that already created the org.
    useOnboardingStore.getState().setCreatedOrganizationId('org_existing');
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(createOrganization).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationId: 'org_existing' } }),
    );
  });

  it('still finishes when an invite fails (best-effort, no trap)', async () => {
    const user = userEvent.setup();
    createInvitation.mockRejectedValueOnce(new Error('bad invite'));
    seedDoneStep(['good@acme.com', 'bad@acme.com']);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    // Org created exactly once, user is sent through despite the invite failure.
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).toHaveBeenCalledTimes(1);
  });
});
