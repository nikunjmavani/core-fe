import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { DEFAULT_DEPLOYMENT_FLAGS } from '@/shared/tenancy/deployment-mode.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { Dashboard } from './Dashboard.tsx';

const { useMeContextMock } = vi.hoisted(() => ({ useMeContextMock: vi.fn() }));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
  meContextQueryKey: ['auth', 'me-context'],
}));
vi.mock('@/shared/components/Dashboard/Dashboard.deferred.tsx', () => ({
  DeferredAnalyticsChart: () => <div data-testid="dashboard-analytics-chart" />,
  DeferredHighlightsCarousel: () => (
    <div data-testid="dashboard-highlights-carousel">
      <div data-testid="dashboard-highlights-tabs" />
    </div>
  ),
  DeferredMembersTable: () => <div data-testid="members-table" />,
  DeferredScheduleCalendar: () => <div data-testid="dashboard-schedule-calendar" />,
  DeferredThemeShowcase: () => <div data-testid="dashboard-theme-showcase" />,
}));

function ctx(overrides: Partial<MeContext> = {}): MeContext {
  return {
    user: {
      id: 'usr_x',
      email: 'ada@acme.test',
      isEmailVerified: true,
      isMfaEnabled: false,
      firstName: 'Ada',
      lastName: null,
      avatarUrl: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    activeOrganization: {
      id: 'org_x',
      name: 'Acme Inc.',
      slug: 'acme',
      type: 'TEAM',
      status: 'ACTIVE',
      logoUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    myPermissions: [
      'organization:read',
      'membership:manage',
      'invitation:manage',
      'role:manage',
    ],
    globalRole: null,
    organizations: [],
    ...overrides,
  };
}

const queryResult = (
  data: MeContext | undefined,
  state: { isLoading?: boolean; isError?: boolean } = {},
) => ({
  data,
  isPending: state.isLoading ?? false,
  isError: state.isError ?? false,
  isFetching: false,
  refetch: vi.fn(),
});

describe('Dashboard', () => {
  beforeEach(() => {
    useOrganizationStore.setState({ deploymentFlags: DEFAULT_DEPLOYMENT_FLAGS });
  });

  it('greets the user and shows the team overview + management actions', async () => {
    useMeContextMock.mockReturnValue(queryResult(ctx()));
    renderWithProviders(<Dashboard />);

    expect(await screen.findByTestId('dashboard-greeting')).toHaveTextContent('Ada');
    expect(
      await screen.findByTestId('dashboard-highlights-carousel'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-highlights-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-workspaces')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-action-invite')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-action-roles')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-action-billing')).toBeInTheDocument();
  });

  it('hides team-only actions for a personal organization', async () => {
    useMeContextMock.mockReturnValue(
      queryResult(
        ctx({
          activeOrganization: {
            id: 'org_p',
            name: 'Personal',
            slug: null,
            type: 'PERSONAL',
            status: 'ACTIVE',
            logoUrl: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-action-invite')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-action-roles')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-action-org-settings')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-action-billing')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-action-account')).toBeInTheDocument();
  });

  it('omits workspace framing in personal-only deployment mode', async () => {
    useOrganizationStore.setState({
      deploymentFlags: { personalOrganizations: true, teamOrganizations: false },
    });
    useMeContextMock.mockReturnValue(
      queryResult(
        ctx({
          activeOrganization: {
            id: 'org_p',
            name: 'Personal',
            slug: null,
            type: 'PERSONAL',
            status: 'ACTIVE',
            logoUrl: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        }),
      ),
    );
    renderWithProviders(<Dashboard />);

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-next-steps')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-org-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-stat-workspaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-stat-type')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-highlights-carousel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-theme-showcase')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-permissions')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-stat-billing')).toBeInTheDocument();
  });

  it('renders a skeleton while the context loads', async () => {
    useMeContextMock.mockReturnValue(queryResult(undefined, { isLoading: true }));
    renderWithProviders(<Dashboard />);
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-stat-workspaces')).not.toBeInTheDocument();
  });
});
