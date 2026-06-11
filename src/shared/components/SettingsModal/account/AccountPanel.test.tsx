import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { AccountPanel } from './AccountPanel.tsx';

const USER = { id: 'usr_1', email: 'you@acme.test', role: 'user' } as AuthUser;

describe('AccountPanel', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER });
  });

  it('renders account info and danger zone from the auth store', () => {
    render(<AccountPanel />);
    expect(screen.getByTestId('settings-section-account')).toBeInTheDocument();
    expect(screen.getByTestId('danger-zone')).toBeInTheDocument();
    expect(screen.getByTestId('account-delete')).toBeInTheDocument();
    expect(screen.getByText('you@acme.test')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AccountPanel />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
