import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { AccountSecurityPanel } from './AccountSecurityPanel.tsx';

describe('AccountSecurityPanel', () => {
  it('renders MFA, passkeys, and sessions', () => {
    render(<AccountSecurityPanel />);
    expect(screen.getByTestId('settings-section-security')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('add-passkey')).toBeInTheDocument();
    expect(screen.getByTestId('session-s1')).toBeInTheDocument();
  });

  it('toggles MFA', async () => {
    const user = userEvent.setup();
    render(<AccountSecurityPanel />);
    const toggle = screen.getByTestId('mfa-toggle');
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AccountSecurityPanel />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
