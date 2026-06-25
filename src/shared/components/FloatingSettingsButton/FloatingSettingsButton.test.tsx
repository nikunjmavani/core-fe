import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setAppearanceOpenMock, useAuthStoreMock, configMock } = vi.hoisted(() => ({
  setAppearanceOpenMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  configMock: { themeLock: false },
}));

vi.mock('@/core/config/env.ts', () => ({ config: configMock }));
vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    useAuthStoreMock(selector),
}));
vi.mock('@/shared/store/useUIStore/index.ts', () => ({
  useUIStore: (selector: (s: { setAppearanceOpen: () => void }) => unknown) =>
    selector({ setAppearanceOpen: setAppearanceOpenMock }),
}));

import { FloatingSettingsButton } from './FloatingSettingsButton.tsx';

describe('FloatingSettingsButton', () => {
  beforeEach(() => {
    setAppearanceOpenMock.mockClear();
    configMock.themeLock = false;
    useAuthStoreMock.mockImplementation((selector) =>
      selector({ isAuthenticated: true }),
    );
  });

  it('opens the appearance dialog on click', () => {
    render(<FloatingSettingsButton />);
    screen.getByTestId('floating-settings').click();
    expect(setAppearanceOpenMock).toHaveBeenCalledWith(true);
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
