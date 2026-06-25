import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

// Stub the dialog: this suite tests the lazy SHELL (store gating + chunk mount),
// not the panel — AppearanceDialog.test.tsx covers that.
vi.mock('./AppearanceDialog.tsx', () => ({
  AppearanceDialog: () => <div data-testid="appearance-dialog-stub" />,
}));

import { AppearanceDialogLazy } from './AppearanceDialogLazy.tsx';

describe('AppearanceDialogLazy', () => {
  afterEach(() => useUIStore.setState({ appearanceOpen: false }));

  it('renders nothing while closed', () => {
    useUIStore.setState({ appearanceOpen: false });
    const { container } = render(<AppearanceDialogLazy />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts the dialog chunk once opened', async () => {
    useUIStore.setState({ appearanceOpen: true });
    render(<AppearanceDialogLazy />);
    expect(await screen.findByTestId('appearance-dialog-stub')).toBeInTheDocument();
  });
});
