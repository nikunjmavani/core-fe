import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { useUIStore } from '@/shared/store/useUIStore/index.ts';
import { DEFAULT_DEPLOYMENT_FLAGS } from '@/shared/tenancy/deployment-mode.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { AppContextStrip } from './AppContextStrip.tsx';

describe('AppContextStrip', () => {
  it('renders launcher pills', async () => {
    useOrganizationStore.setState({ deploymentFlags: DEFAULT_DEPLOYMENT_FLAGS });
    renderWithProviders(<AppContextStrip />);

    expect(await screen.findByTestId('app-context-strip')).toBeInTheDocument();
    expect(screen.getByTestId('context-strip-profile')).toBeInTheDocument();
    expect(screen.getByTestId('context-strip-billing')).toBeInTheDocument();
  });

  it('opens the command palette from search', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ commandPaletteOpen: false });
    renderWithProviders(<AppContextStrip />);

    await user.click(await screen.findByTestId('context-strip-search'));
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<AppContextStrip />);
    await screen.findByTestId('app-context-strip');
    expect(await axe(container)).toHaveNoViolations();
  });
});
