import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { SecuritySettings } from './SecuritySettings.tsx';

describe('SecuritySettings', () => {
  it('renders MFA, passkeys, and sessions', () => {
    render(<SecuritySettings />);
    expect(screen.getByTestId('security-settings')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('add-passkey')).toBeInTheDocument();
    expect(screen.getByTestId('session-s1')).toBeInTheDocument();
  });

  it('toggles MFA', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);
    const toggle = screen.getByTestId('mfa-toggle');
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SecuritySettings />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
