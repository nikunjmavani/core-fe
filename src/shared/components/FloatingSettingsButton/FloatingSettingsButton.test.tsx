import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { navigateMock, useAuthStoreMock, configMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  configMock: { themeLock: false },
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }));
vi.mock('@/core/config/env.ts', () => ({ config: configMock }));
vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    useAuthStoreMock(selector),
}));

import { FloatingSettingsButton } from './FloatingSettingsButton.tsx';

describe('FloatingSettingsButton', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    configMock.themeLock = false;
    useAuthStoreMock.mockImplementation((selector) =>
      selector({ isAuthenticated: true }),
    );
  });

  it('opens the appearance settings hash on click', () => {
    render(<FloatingSettingsButton />);
    screen.getByTestId('floating-settings').click();
    expect(navigateMock).toHaveBeenCalledWith({
      to: '.',
      hash: 'settings/account/appearance',
    });
  });

  it('renders nothing when signed out', () => {
    useAuthStoreMock.mockImplementation((selector) =>
      selector({ isAuthenticated: false }),
    );
    render(<FloatingSettingsButton />);
    expect(screen.queryByTestId('floating-settings')).not.toBeInTheDocument();
  });

  it('renders nothing when the theme is locked', () => {
    configMock.themeLock = true;
    render(<FloatingSettingsButton />);
    expect(screen.queryByTestId('floating-settings')).not.toBeInTheDocument();
  });
});
