import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: '/dashboard' } }),
}));
vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: (
    selector: (s: { isAuthenticated: boolean; isLoading: boolean }) => unknown,
  ) => selector({ isAuthenticated: true, isLoading: false }),
}));

// Stub the dialog: this suite tests the lazy SHELL (store gating + chunk mount),
// not the panel — LanguageDialog.test.tsx covers that.
vi.mock('./LanguageDialog.tsx', () => ({
  LanguageDialog: () => <div data-testid="language-dialog-stub" />,
}));

import { LanguageDialogLazy } from './LanguageDialogLazy.tsx';

describe('LanguageDialogLazy', () => {
  afterEach(() => useUIStore.setState({ languageOpen: false }));

  it('renders nothing while closed', () => {
    useUIStore.setState({ languageOpen: false });
    const { container } = render(<LanguageDialogLazy />);
    expect(container.firstChild).toBeNull();
  });

  it('mounts the dialog chunk once opened', async () => {
    useUIStore.setState({ languageOpen: true });
    render(<LanguageDialogLazy />);
    expect(await screen.findByTestId('language-dialog-stub')).toBeInTheDocument();
  });
});
