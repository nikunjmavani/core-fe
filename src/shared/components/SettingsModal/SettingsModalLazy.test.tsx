import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the heavy modal: this suite tests the lazy SHELL (hash gating + chunk
// mounting), not the panels — SettingsModal.test.tsx covers those.
vi.mock('./SettingsModal.tsx', () => ({
  SettingsModal: () => <div data-testid="settings-modal-stub" />,
}));

const routerState = { hash: '' };
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { hash: routerState.hash } }),
}));

import { SettingsModalLazy } from './SettingsModalLazy.tsx';

describe('SettingsModalLazy', () => {
  beforeEach(() => {
    routerState.hash = '';
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

  it('mounts the modal chunk when a settings hash is present', async () => {
    routerState.hash = 'settings/account/profile';
    render(<SettingsModalLazy />);
    expect(await screen.findByTestId('settings-modal-stub')).toBeInTheDocument();
  });
});
