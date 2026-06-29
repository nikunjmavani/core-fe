import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/tests/fixtures/notification-fixtures.ts';

const { usePrefsMock, updateMutate, requestPermissionMock } = vi.hoisted(() => ({
  usePrefsMock: vi.fn(),
  updateMutate: vi.fn(),
  requestPermissionMock: vi.fn(),
}));
vi.mock('@/shared/hooks/useNotifications/index.ts', () => ({
  useNotificationPreferences: usePrefsMock,
  useUpdateNotificationPreferences: () => ({ mutate: updateMutate }),
}));
vi.mock('@/shared/notifications/desktop.ts', () => ({
  requestDesktopPermission: requestPermissionMock,
}));

import { AccountNotificationsPanel } from './AccountNotificationsPanel.tsx';

beforeEach(() => {
  vi.clearAllMocks();
  usePrefsMock.mockReturnValue({
    data: DEFAULT_NOTIFICATION_PREFERENCES,
    isLoading: false,
    isError: false,
  });
  requestPermissionMock.mockResolvedValue('granted');
});

describe('AccountNotificationsPanel', () => {
  it('renders the category × channel matrix', () => {
    render(<AccountNotificationsPanel />);
    expect(screen.getByTestId('settings-section-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('notify-system-email')).toBeInTheDocument();
    expect(screen.getByTestId('notify-billing-desktop')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    usePrefsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<AccountNotificationsPanel />);
    expect(screen.getByTestId('notifications-prefs-loading')).toBeInTheDocument();
  });

  it('saves on toggle (full-replace) with the changed preference', async () => {
    const user = userEvent.setup();
    render(<AccountNotificationsPanel />);
    // system/email defaults on → toggling turns it off
    await user.click(screen.getByTestId('notify-system-email'));
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const saved = updateMutate.mock.calls[0][0] as Array<{
      category: string;
      channel: string;
      enabled: boolean;
    }>;
    expect(saved).toContainEqual({
      category: 'system',
      channel: 'email',
      enabled: false,
    });
  });

  it('asks for OS permission before enabling desktop, then saves when granted', async () => {
    requestPermissionMock.mockResolvedValue('granted');
    const user = userEvent.setup();
    render(<AccountNotificationsPanel />);
    await user.click(screen.getByTestId('notify-system-desktop'));
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(updateMutate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { category: 'system', channel: 'desktop', enabled: true },
        ]),
      ),
    );
  });

  it('does not enable desktop (or save) when permission is denied', async () => {
    requestPermissionMock.mockResolvedValue('denied');
    const user = userEvent.setup();
    render(<AccountNotificationsPanel />);
    await user.click(screen.getByTestId('notify-system-desktop'));
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(updateMutate).not.toHaveBeenCalled();
  });
});
