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

const hydratedContextRef = vi.hoisted(() => ({
  value: {
    user: {
      id: 'usr_1',
      email: 'a@b.test',
      firstName: 'A',
      lastName: null,
      onboardingCompleted: true,
    },
    activeOrganization: null,
    myPermissions: ['organization:read'],
    globalRole: null,
    organizations: [],
    deploymentFlags: { personalOrganizations: false, teamOrganizations: true },
    personalOrganizationId: null as string | null,
  },
}));
vi.mock('@/shared/tenancy/session-context.ts', () => ({
  hydrateSessionContext: vi.fn(() => Promise.resolve(hydratedContextRef.value)),
}));

const navigate = vi.fn();
const searchRef = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
  useSearch: () => searchRef.value,
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

const inviteMember = vi.fn();
const listRoles = vi.fn();
const createRole = vi.fn();
vi.mock('@/shared/api/organization-api.ts', () => ({
  inviteMember: (...args: unknown[]) => inviteMember(...args),
  listRoles: (...args: unknown[]) => listRoles(...args),
  createRole: (...args: unknown[]) => createRole(...args),
}));

/** A non-system role row shaped like organization-api's RoleSummary. */
function memberRole(id = 'rol_member') {
  return {
    id,
    name: 'Member',
    description: '',
    permissions: [],
    memberCount: 0,
    isSystem: false,
  };
}

vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: {
    updateProfile: vi.fn().mockResolvedValue(undefined),
    completeOnboarding: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { OnboardingPage } from './OnboardingPage.tsx';

/** Drop the wizard on the final step with a chosen org name + invites. */
function seedDoneStep(invites: string[] = []) {
  const store = useOnboardingStore.getState();
  store.reset();
  store.patch({ organizationName: 'Acme Inc.', invites });
  store.setStepIndex(5); // 'done'
}

const TS = '2026-01-01T00:00:00.000Z';

/**
 * A switch (to org or personal) re-mints the token and returns the post-switch
 * context with `activeOrganization` applied — that context is what the
 * onboarding-finish navigation resolves against. Build it from the current
 * hydrated context so deployment flags stay consistent per test.
 */
function ctxWithActive(active: unknown) {
  return { ...hydratedContextRef.value, activeOrganization: active };
}
function teamOrg(slug: string) {
  return {
    id: `org_${slug}`,
    name: 'Acme Inc.',
    slug,
    type: 'TEAM' as const,
    status: 'ACTIVE' as const,
    logoUrl: null,
    createdAt: TS,
    updatedAt: TS,
  };
}
function personalOrg() {
  return {
    id: 'org_personal_1',
    name: 'Personal',
    slug: null,
    type: 'PERSONAL' as const,
    status: 'ACTIVE' as const,
    logoUrl: null,
    createdAt: TS,
    updatedAt: TS,
  };
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFlagsRef.value = { personalOrganizations: false, teamOrganizations: true };
    hydratedContextRef.value = {
      user: {
        id: 'usr_1',
        email: 'a@b.test',
        firstName: 'A',
        lastName: null,
        onboardingCompleted: true,
      },
      activeOrganization: null,
      myPermissions: ['organization:read'],
      globalRole: null,
      organizations: [],
      deploymentFlags: { personalOrganizations: false, teamOrganizations: true },
      personalOrganizationId: null,
    };
    switchToOrganization.mockImplementation(async () => ctxWithActive(teamOrg('acme')));
    switchToPersonal.mockImplementation(async () => ctxWithActive(personalOrg()));
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
    // A just-activated org already has an assignable role, so invites reuse it.
    listRoles.mockResolvedValue({ rows: [memberRole()] });
    createRole.mockResolvedValue(memberRole('rol_created'));
    inviteMember.mockResolvedValue({ id: 'mem_1', email: 'a@acme.com' });
    useOnboardingStore.getState().reset();
  });

  it('renders the page container', async () => {
    renderWithProviders(<OnboardingPage />);
    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
  });

  it("wipes a previous user's persisted wizard state when a different user signs in", async () => {
    // User A abandoned the wizard mid-flow on this browser: owner bound,
    // name typed, a later step reached — all persisted to localStorage.
    const store = useOnboardingStore.getState();
    store.claimForUser('usr_previous');
    store.patch({ firstName: 'Prev', lastName: 'User', teamSize: '2–10' });
    store.setStepIndex(2);

    // User B signs in on the same browser — me/context resolves with THEIR id.
    vi.mocked(useMeContext).mockReturnValue({
      data: {
        user: {
          id: 'usr_next',
          email: 'next@example.test',
          firstName: null,
          lastName: null,
          onboardingCompleted: false,
        },
        activeOrganization: null,
        myPermissions: ['organization:read'],
        globalRole: null,
        organizations: [],
        deploymentFlags: { personalOrganizations: false, teamOrganizations: true },
        personalOrganizationId: null,
      },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useMeContext>);

    try {
      renderWithProviders(<OnboardingPage />);

      // The claim wipes user A's progress and binds the store to user B — the
      // wizard restarts from scratch instead of submitting A's name for B.
      await waitFor(() => {
        expect(useOnboardingStore.getState().forUserId).toBe('usr_next');
      });
      const state = useOnboardingStore.getState();
      expect(state.stepIndex).toBe(0);
      expect(state.data.firstName).toBe('');
      expect(state.data.teamSize).toBe('');
    } finally {
      // Restore the suite default (clearAllMocks does not undo mockReturnValue).
      vi.mocked(useMeContext).mockReturnValue({
        data: null,
        isPending: false,
        isError: false,
      } as unknown as ReturnType<typeof useMeContext>);
    }
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
    switchToOrganization.mockImplementationOnce(async () =>
      ctxWithActive(teamOrg('existing-slug')),
    );
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToOrganization).toHaveBeenCalledWith('org_existing');
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationSlug: 'existing-slug' } }),
    );
  });

  it('activates the sole existing team org instead of personal (invited/pre-provisioned user)', async () => {
    const user = userEvent.setup();
    // Hybrid deployment; the wizard creates nothing. The user ALREADY belongs
    // to one team (invited or seeded) and has a personal org provisioned.
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    hydratedContextRef.value = {
      ...hydratedContextRef.value,
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      organizations: [teamOrg('acme')],
      personalOrganizationId: 'org_personal_1',
    };
    const store = useOnboardingStore.getState();
    store.reset();
    store.setStepIndex(4); // hybrid+team steps: welcome/profile/questions/invite/done
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    // Their team is the destination — NOT the personal fallback that used to
    // hide the workspace they were brought here to join.
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToOrganization).toHaveBeenCalledWith('org_acme');
    expect(switchToPersonal).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { organizationSlug: 'acme' }, replace: true }),
    );
  });

  it('falls back to personal when several teams exist (no unambiguous destination)', async () => {
    const user = userEvent.setup();
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    hydratedContextRef.value = {
      ...hydratedContextRef.value,
      deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
      organizations: [teamOrg('acme'), teamOrg('beta')],
      personalOrganizationId: 'org_personal_1',
    };
    const store = useOnboardingStore.getState();
    store.reset();
    store.setStepIndex(4);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(switchToOrganization).not.toHaveBeenCalled();
    expect(switchToPersonal).toHaveBeenCalledTimes(1);
  });

  it('returns the user to the guarded deep link after finishing (?redirect=)', async () => {
    const user = userEvent.setup();
    searchRef.value = { redirect: '/organization/acme/settings' };
    try {
      seedDoneStep();
      renderWithProviders(<OnboardingPage />);

      await user.click(await screen.findByTestId('onboarding-finish'));

      await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
      expect(navigate).toHaveBeenCalledWith({
        to: '/organization/acme/settings',
        replace: true,
      });
    } finally {
      searchRef.value = {};
    }
  });

  it('ignores an unsafe redirect and falls back to the resolved workspace', async () => {
    const user = userEvent.setup();
    searchRef.value = { redirect: 'https://evil.example/phish' };
    try {
      seedDoneStep();
      renderWithProviders(<OnboardingPage />);

      await user.click(await screen.findByTestId('onboarding-finish'));

      await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ params: { organizationSlug: 'acme' }, replace: true }),
      );
    } finally {
      searchRef.value = {};
    }
  });

  it('persists the typed profile name BEFORE refetching me/context (greeting consistency)', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    const { authApi } = await import('@/shared/api/auth-api.ts');
    const { hydrateSessionContext } = await import('@/shared/tenancy/session-context.ts');
    const { setAccessToken, clearAccessToken } = await import('@/shared/auth/token.ts');
    // Structurally valid base64url JWT — setAccessToken validates the shape.
    const b64u = (value: object) =>
      btoa(JSON.stringify(value))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const fakeJwt = `${b64u({ alg: 'none' })}.${b64u({ sub: 'usr_1', exp: 9999999999 })}.sig`;
    setAccessToken(fakeJwt);
    vi.mocked(authApi.updateProfile).mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 20)); // let hydrate overtake if unordered
      order.push('updateProfile');
    });
    vi.mocked(hydrateSessionContext).mockImplementationOnce(async () => {
      order.push('hydrate');
      return hydratedContextRef.value;
    });
    try {
      seedDoneStep();
      useOnboardingStore.getState().patch({ firstName: 'Ada', lastName: 'Lovelace' });
      renderWithProviders(<OnboardingPage />);

      await user.click(await screen.findByTestId('onboarding-finish'));

      await waitFor(() => expect(navigate).toHaveBeenCalled());
      // The PATCH must land before the refetch, or the refreshed context still
      // carries firstName: null and the dashboard greets by email prefix.
      expect(order).toEqual(['updateProfile', 'hydrate']);
    } finally {
      clearAccessToken();
    }
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
    inviteMember.mockRejectedValueOnce(new Error('bad invite'));
    seedDoneStep(['good@acme.com', 'bad@acme.com']);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    // Org created exactly once, user is sent through despite the invite failure.
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).toHaveBeenCalledTimes(1);
  });

  it('invites teammates as members via POST /memberships with a real role id', async () => {
    // Regression: the finish step hit the non-existent POST /invitations (404).
    // It now creates INVITED memberships (inviteMember) with a real role_id,
    // AFTER the token has switched to the new org.
    const user = userEvent.setup();
    seedDoneStep(['a@acme.com', 'b@acme.com']);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    // Token switched to the new org before inviting.
    expect(switchToOrganization).toHaveBeenCalledWith('org_new');
    expect(inviteMember).toHaveBeenCalledTimes(2);
    expect(inviteMember).toHaveBeenCalledWith({
      email: 'a@acme.com',
      roleId: 'rol_member',
    });
    expect(inviteMember).toHaveBeenCalledWith({
      email: 'b@acme.com',
      roleId: 'rol_member',
    });
    // The org already had an assignable role, so none was provisioned.
    expect(createRole).not.toHaveBeenCalled();
  });

  it('provisions a default Member role when the fresh org seeds only Owner', async () => {
    // A freshly created org has only the system Owner role — nothing to invite
    // anyone as — so the finish step provisions a "Member" role first.
    const user = userEvent.setup();
    listRoles.mockResolvedValueOnce({
      rows: [{ ...memberRole('rol_owner'), name: 'Owner', isSystem: true }],
    });
    createRole.mockResolvedValueOnce(memberRole('rol_provisioned'));
    seedDoneStep(['a@acme.com']);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(createRole).toHaveBeenCalledTimes(1);
    expect(inviteMember).toHaveBeenCalledWith({
      email: 'a@acme.com',
      roleId: 'rol_provisioned',
    });
  });

  it('finishes both mode to personal dashboard without creating a team org', async () => {
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    hydratedContextRef.value.deploymentFlags = {
      personalOrganizations: true,
      teamOrganizations: true,
    };
    hydratedContextRef.value.personalOrganizationId = 'org_personal_1';
    const user = userEvent.setup();
    const store = useOnboardingStore.getState();
    store.reset();
    store.patch({ firstName: 'Ada', lastName: 'Lovelace' });
    store.setStepIndex(3);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToPersonal).toHaveBeenCalledTimes(1);
    // Lands DIRECTLY on the personal dashboard — no bounce through `/`.
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true }),
    );
  });

  // Regression: personal orgs are *enabled* for the deployment, but this user has
  // none provisioned (core-be provisions best-effort, so it can be missing).
  // me/context reports `personalOrganizationId: null` — finishing onboarding must
  // NOT fire `switch-to-personal` (it would 404 and trap the user), and should
  // still land on the `/` resolver.
  it('skips switch-to-personal when the deployment enables personal but the user has none', async () => {
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    hydratedContextRef.value.deploymentFlags = {
      personalOrganizations: true,
      teamOrganizations: true,
    };
    hydratedContextRef.value.personalOrganizationId = null;
    const user = userEvent.setup();
    const store = useOnboardingStore.getState();
    store.reset();
    store.patch({ firstName: 'Ada', lastName: 'Lovelace' });
    store.setStepIndex(3);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToPersonal).not.toHaveBeenCalled();
    // Onboarding is complete, so the resolver routes this personal-mode session to
    // `/dashboard` directly (the personal workspace self-heals on the next read);
    // the old `/` fallback only fired when the resolver still wanted onboarding.
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true }),
    );
  });

  // Mode coverage: personal-only never creates a team org; the personal workspace
  // exists, so finishing lands DIRECTLY on `/dashboard`.
  it('personal-only mode finishes directly to the personal dashboard', async () => {
    deploymentFlagsRef.value = { personalOrganizations: true, teamOrganizations: false };
    hydratedContextRef.value.deploymentFlags = {
      personalOrganizations: true,
      teamOrganizations: false,
    };
    hydratedContextRef.value.personalOrganizationId = 'org_personal_1';
    const user = userEvent.setup();
    const store = useOnboardingStore.getState();
    store.reset();
    store.patch({ firstName: 'Ada', lastName: 'Lovelace' });
    store.setStepIndex(3);
    renderWithProviders(<OnboardingPage />);

    await user.click(await screen.findByTestId('onboarding-finish'));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(createOrganization).not.toHaveBeenCalled();
    expect(switchToPersonal).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true }),
    );
  });
});
