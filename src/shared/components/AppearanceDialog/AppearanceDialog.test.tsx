import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

import { AppearanceDialog } from './AppearanceDialog.tsx';

// The panel itself is covered by its own suite; stub it to keep this focused.
vi.mock('./AppearancePanel.tsx', () => ({
  AppearancePanel: () => <div data-testid="appearance-panel" />,
}));

describe('AppearanceDialog', () => {
  afterEach(() => useUIStore.setState({ appearanceOpen: false }));

  it('renders the appearance panel when the store flag is open', () => {
    useUIStore.setState({ appearanceOpen: true });
    render(<AppearanceDialog />);
    expect(screen.getByTestId('appearance-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('appearance-panel')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    useUIStore.setState({ appearanceOpen: false });
    render(<AppearanceDialog />);
    expect(screen.queryByTestId('appearance-dialog')).not.toBeInTheDocument();
  });
});
