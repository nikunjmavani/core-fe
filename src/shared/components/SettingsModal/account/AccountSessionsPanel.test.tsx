import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useSessionsMock, revokeMutateAsync } = vi.hoisted(() => ({
  useSessionsMock: vi.fn(),
  revokeMutateAsync: vi.fn(),
}));
vi.mock('@/shared/hooks/useSessions/index.ts', () => ({
  useSessions: useSessionsMock,
  useRevokeSession: () => ({ mutateAsync: revokeMutateAsync }),
}));

import { AccountSessionsPanel } from './AccountSessionsPanel.tsx';

const CURRENT = {
  id: 'ses_current',
  device: 'MacBook Pro',
  browser: 'Chrome',
  location: 'SF',
  lastActiveAt: '2026-06-24T00:00:00.000Z',
  current: true,
};
const OTHER = {
  id: 'ses_other',
  device: 'iPhone 15',
  browser: 'Safari',
  location: 'SF',
  lastActiveAt: '2026-06-23T00:00:00.000Z',
  current: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  revokeMutateAsync.mockResolvedValue(undefined);
});

describe('AccountSessionsPanel', () => {
  it('shows a loading state', () => {
    useSessionsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<AccountSessionsPanel />);
    expect(screen.getByTestId('sessions-loading')).toBeInTheDocument();
  });

  it('lists sessions; the current device is badged and not revocable', () => {
    useSessionsMock.mockReturnValue({
      data: [CURRENT, OTHER],
      isLoading: false,
      isError: false,
    });
    render(<AccountSessionsPanel />);
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    // current session has no revoke control; the other one does
    expect(screen.queryByTestId('session-revoke-ses_current')).not.toBeInTheDocument();
    expect(screen.getByTestId('session-revoke-ses_other')).toBeInTheDocument();
  });

  it('confirms and revokes another session', async () => {
    useSessionsMock.mockReturnValue({
      data: [CURRENT, OTHER],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<AccountSessionsPanel />);
    await user.click(screen.getByTestId('session-revoke-ses_other'));
    await user.click(screen.getByTestId('confirm-accept'));
    await waitFor(() => expect(revokeMutateAsync).toHaveBeenCalledWith('ses_other'));
  });
});
