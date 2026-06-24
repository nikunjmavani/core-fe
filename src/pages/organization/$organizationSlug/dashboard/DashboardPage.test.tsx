import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { DashboardPage } from './DashboardPage.tsx';

const { useMeContextMock } = vi.hoisted(() => ({ useMeContextMock: vi.fn() }));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
  meContextQueryKey: ['auth', 'me-context'],
}));

describe('DashboardPage', () => {
  it('renders the shared Dashboard surface', async () => {
    useMeContextMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
  });
});
