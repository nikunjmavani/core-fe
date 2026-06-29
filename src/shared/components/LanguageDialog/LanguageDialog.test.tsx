import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

import { LanguageDialog } from './LanguageDialog.tsx';

// The panel itself is covered by its own suite; stub it to keep this focused.
vi.mock('./LanguagePanel.tsx', () => ({
  LanguagePanel: () => <div data-testid="language-panel" />,
}));

describe('LanguageDialog', () => {
  afterEach(() => useUIStore.setState({ languageOpen: false }));

  it('renders the language panel when the store flag is open', () => {
    useUIStore.setState({ languageOpen: true });
    render(<LanguageDialog />);
    expect(screen.getByTestId('language-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('language-panel')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    useUIStore.setState({ languageOpen: false });
    render(<LanguageDialog />);
    expect(screen.queryByTestId('language-dialog')).not.toBeInTheDocument();
  });

  it('closes on a pointer-down outside the panel', () => {
    useUIStore.setState({ languageOpen: true });
    render(<LanguageDialog />);
    expect(screen.getByTestId('language-dialog')).toBeInTheDocument();
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(useUIStore.getState().languageOpen).toBe(false);
  });

  it('closes via the close button', () => {
    useUIStore.setState({ languageOpen: true });
    render(<LanguageDialog />);
    act(() => {
      screen.getByTestId('language-close').click();
    });
    expect(useUIStore.getState().languageOpen).toBe(false);
  });
});
