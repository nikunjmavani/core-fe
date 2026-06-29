import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the heavy modal: this suite tests the lazy SHELL (hash gating + chunk
// mounting), not the panels — SettingsModal.test.tsx covers those.
vi.mock('./SettingsModal.tsx', () => ({
  SettingsModal: () => <div data-testid="settings-modal-stub" />,
}));

const navigateMock = vi.fn();
const routerState = { hash: '', pathname: '/dashboard' };
const authState = { isAuthenticated: true, isLoading: false };
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigateMock,
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { hash: routerState.hash, pathname: routerState.pathname } }),
}));
vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

import { SettingsModalLazy } from './SettingsModalLazy.tsx';

describe('SettingsModalLazy', () => {
  beforeEach(() => {
    routerState.hash = '';
    routerState.pathname = '/dashboard';
    authState.isAuthenticated = true;
    authState.isLoading = false;
    navigateMock.mockReset();
  });

  it('renders nothing while the hash is not a settings hash', () => {
    routerState.hash = '';
    const { container } = render(<SettingsModalLazy />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for unrelated hashes', () => {
    routerState.hash = 'some-anchor';
    const { container } = render(<SettingsModalLazy />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts the modal chunk when a settings hash is present on an allowed path', async () => {
    routerState.hash = 'settings/account/profile';
    routerState.pathname = '/dashboard';
    render(<SettingsModalLazy />);
    expect(await screen.findByTestId('settings-modal-stub')).toBeInTheDocument();
  });

  it('does not mount on onboarding and strips the settings hash', async () => {
    routerState.hash = 'settings/account/profile';
    routerState.pathname = '/onboarding';
    const { container } = render(<SettingsModalLazy />);
    expect(container.firstChild).toBeNull();
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({ hash: '', replace: true }),
      ),
    );
  });

  it('does not mount for signed-out users and strips the settings hash', async () => {
    authState.isAuthenticated = false;
    routerState.hash = 'settings/account/profile';
    render(<SettingsModalLazy />);
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({ hash: '', replace: true }),
      ),
    );
  });

  it('waits for auth bootstrap before stripping or mounting', () => {
    authState.isLoading = true;
    authState.isAuthenticated = false;
    routerState.hash = 'settings/account/profile';
    const { container } = render(<SettingsModalLazy />);
    expect(container.firstChild).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
