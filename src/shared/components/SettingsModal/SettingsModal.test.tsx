import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { SettingsModal } from './SettingsModal.tsx';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

const USER = { id: 'usr_1', email: 'u@e.com', role: 'user' } as AuthUser;

describe('SettingsModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER, isAuthenticated: true });
    useOrganizationStore.getState().clearOrganization();
  });

  it('renders nothing without a settings hash', () => {
    renderWithProviders(<SettingsModal />);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('opens at the section addressed by the hash', async () => {
    renderWithProviders(<SettingsModal />, {
      initialEntries: ['/#settings/account/profile'],
    });
    expect(await screen.findByTestId('settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
  });
});
