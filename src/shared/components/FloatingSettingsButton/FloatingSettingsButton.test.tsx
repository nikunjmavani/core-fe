import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setAppearanceOpenMock, configMock, uiState } = vi.hoisted(() => ({
  setAppearanceOpenMock: vi.fn(),
  configMock: { themeLock: false },
  uiState: { appearanceOpen: false },
}));

vi.mock('@/core/config/env.ts', () => ({ config: configMock }));
vi.mock('@/shared/store/useUIStore/index.ts', () => ({
  useUIStore: (
    selector: (s: { appearanceOpen: boolean; setAppearanceOpen: () => void }) => unknown,
  ) =>
    selector({
      appearanceOpen: uiState.appearanceOpen,
      setAppearanceOpen: setAppearanceOpenMock,
    }),
}));

import { FloatingSettingsButton } from './FloatingSettingsButton.tsx';

describe('FloatingSettingsButton', () => {
  beforeEach(() => {
    setAppearanceOpenMock.mockClear();
    configMock.themeLock = false;
    uiState.appearanceOpen = false;
  });

  it('opens the appearance popup on click', () => {
    render(<FloatingSettingsButton />);
    screen.getByTestId('floating-settings').click();
    expect(setAppearanceOpenMock).toHaveBeenCalledWith(true);
  });

  it('renders nothing when the theme is locked', () => {
    configMock.themeLock = true;
    render(<FloatingSettingsButton />);
    expect(screen.queryByTestId('floating-settings')).not.toBeInTheDocument();
  });

  it('renders nothing while the popup is already open', () => {
    uiState.appearanceOpen = true;
    render(<FloatingSettingsButton />);
    expect(screen.queryByTestId('floating-settings')).not.toBeInTheDocument();
  });
});
