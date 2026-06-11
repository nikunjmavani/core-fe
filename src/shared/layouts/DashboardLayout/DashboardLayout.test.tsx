import { axe } from 'vitest-axe';

vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
  },
}));

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { Component as DashboardLayout } from './DashboardLayout.tsx';

describe('DashboardLayout', () => {
  it('renders the app shell: sidebar, header, main region, mobile nav', async () => {
    const { findByTestId } = renderWithProviders(<DashboardLayout />);

    expect(await findByTestId('dashboard-layout')).toBeInTheDocument();
    expect(await findByTestId('sidebar')).toBeInTheDocument();
    expect(await findByTestId('header')).toBeInTheDocument();
    expect(await findByTestId('main-content')).toBeInTheDocument();
    expect(await findByTestId('mobile-bottom-bar')).toBeInTheDocument();
  });

  it('exposes the primary navigation and user menu controls', async () => {
    const { findAllByTestId, findByTestId } = renderWithProviders(<DashboardLayout />);

    // nav links render twice by design: sidebar + mobile bottom bar
    expect(await findAllByTestId('nav-dashboard')).toHaveLength(2);
    expect(await findByTestId('user-menu-trigger')).toBeInTheDocument();
    expect(await findByTestId('search-trigger')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container, findByTestId } = renderWithProviders(<DashboardLayout />);
    await findByTestId('dashboard-layout');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
