import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

vi.mock('@/shared/hooks/useUnsavedChangesGuard/index.ts', () => ({
  useUnsavedChangesGuard: () => ({ guardDialog: null, isBlocked: false }),
}));

vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: vi.fn(() => ({ data: null, isPending: false, isError: false })),
  meContextQueryKey: ['auth', 'me-context'],
}));

vi.mock('@/shared/tenancy/session-context.ts', () => ({
  hydrateSessionContext: vi.fn().mockResolvedValue({
    user: { id: 'usr_1', email: 'a@b.test', firstName: 'A', lastName: null },
    activeOrganization: null,
    myPermissions: [],
    globalRole: null,
    organizations: [],
    deploymentFlags: { personalOrganizations: false, teamOrganizations: true },
    personalOrganizationId: null,
  }),
}));

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));

const switchToOrganization = vi.fn();
const switchToPersonal = vi.fn();
vi.mock('@/shared/tenancy/switch.ts', () => ({
  switchToOrganization: (...args: unknown[]) => switchToOrganization(...args),
  switchToPersonal: (...args: unknown[]) => switchToPersonal(...args),
}));

const deploymentFlagsRef = vi.hoisted(() => ({
  value: { personalOrganizations: false, teamOrganizations: true },
}));
vi.mock('@/shared/hooks/useDeploymentFlags/index.ts', () => ({
  useDeploymentFlags: () => deploymentFlagsRef.value,
}));

const createOrganization = vi.fn();
const listMyOrganizations = vi.fn();
vi.mock('@/shared/tenancy/my-organizations.ts', () => ({
  createOrganization: (...args: unknown[]) => createOrganization(...args),
  listMyOrganizations: (...args: unknown[]) => listMyOrganizations(...args),
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
    deploymentFlagsRef.value = { personalOrganizations: false, teamOrganizations: true };
    switchToOrganization.mockResolvedValue(undefined);
    switchToPersonal.mockResolvedValue(undefined);
    listMyOrganizations.mockResolvedValue([]);
    createOrganization.mockImplementation(async () => {
      const org = {
        id: 'org_new',
        name: 'Acme Inc.',
        slug: 'acme',
        status: 'active' as const,
        logoUrl: null,
      };
      listMyOrganizations.mockResolvedValue([org]);
      return org;
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
    expect(switchToOrganization).toHaveBeenCalledWith('org_new');
    expect(useOnboardingStore.getState().createdOrganizationId).toBe('org_new');
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationSlug: 'acme' }, replace: true }),
    );
  });

  it('does NOT re-create the org on a retry after a partial failure', async () => {
    const user = userEvent.setup();
    seedDoneStep(['a@acme.com']);
    listMyOrganizations.mockResolvedValue([
      { id: 'org_existing', name: 'Existing', slug: 'existing-slug', status: 'active' },
    ]);
    // Simulate a prior attempt that already created the org (id + slug stored).
    useOnboardingStore.getState().setCreatedOrganizationId('org_existing');
    useOnboardingStore.getState().setCreatedOrganizationSlug('existing-slug');
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToOrganization).toHaveBeenCalledWith('org_existing');
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationSlug: 'existing-slug' } }),
    );
  });

  it('creates the org when persisted createdOrganizationId is stale (404 guard)', async () => {
    const user = userEvent.setup();
    seedDoneStep();
    listMyOrganizations.mockResolvedValue([]);
    useOnboardingStore.getState().setCreatedOrganizationId('org_stale');
    useOnboardingStore.getState().setCreatedOrganizationSlug('acme');
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(createOrganization).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationSlug: 'acme' } }),
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

  it('finishes both mode to personal dashboard without creating a team org', async () => {
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    const user = userEvent.setup();
    const store = useOnboardingStore.getState();
    store.reset();
    store.patch({ fullName: 'Ada Lovelace' });
    store.setStepIndex(3);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToPersonal).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/', replace: true }),
    );
  });
});
