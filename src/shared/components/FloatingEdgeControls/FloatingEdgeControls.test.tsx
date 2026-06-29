import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { platformConfigMock, uiState } = vi.hoisted(() => ({
  platformConfigMock: { themeLock: false },
  uiState: { appearanceOpen: false, languageOpen: false },
}));

vi.mock('@/core/config/env.ts', () => ({ platformConfig: platformConfigMock }));
vi.mock('@/shared/store/useUIStore/index.ts', () => ({
  useUIStore: (
    selector: (s: { appearanceOpen: boolean; languageOpen: boolean }) => unknown,
  ) =>
    selector({
      appearanceOpen: uiState.appearanceOpen,
      languageOpen: uiState.languageOpen,
    }),
}));
vi.mock('@/shared/components/FloatingSettingsButton/index.ts', () => ({
  FloatingSettingsButton: () => <div data-testid="floating-settings-stub" />,
}));
vi.mock('@/shared/components/FloatingLanguageButton/index.ts', () => ({
  FloatingLanguageButton: () => <div data-testid="floating-language-stub" />,
}));

import { FloatingEdgeControls } from './FloatingEdgeControls.tsx';

describe('FloatingEdgeControls', () => {
  beforeEach(() => {
    platformConfigMock.themeLock = false;
    uiState.appearanceOpen = false;
    uiState.languageOpen = false;
  });

  it('renders theme and language handles when unlocked', () => {
    render(<FloatingEdgeControls />);
    expect(screen.getByTestId('floating-edge-controls')).toBeInTheDocument();
    expect(screen.getByTestId('floating-settings-stub')).toBeInTheDocument();
    expect(screen.getByTestId('floating-language-stub')).toBeInTheDocument();
  });

  it('hides the stack while the appearance panel is open', () => {
    uiState.appearanceOpen = true;
    render(<FloatingEdgeControls />);
    expect(screen.queryByTestId('floating-edge-controls')).not.toBeInTheDocument();
  });

  it('hides the stack while the language panel is open', () => {
    uiState.languageOpen = true;
    render(<FloatingEdgeControls />);
    expect(screen.queryByTestId('floating-edge-controls')).not.toBeInTheDocument();
  });

  it('omits the theme handle when the theme is locked', () => {
    platformConfigMock.themeLock = true;
    render(<FloatingEdgeControls />);
    expect(screen.queryByTestId('floating-settings-stub')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-language-stub')).toBeInTheDocument();
  });
});
