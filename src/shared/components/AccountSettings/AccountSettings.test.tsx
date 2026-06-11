/* eslint-disable jsx-a11y/aria-role -- `role` here is a domain prop on AccountSettings, not the HTML/ARIA role attribute */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { AccountSettings } from './AccountSettings.tsx';

describe('AccountSettings', () => {
  it('renders account info and danger zone', () => {
    render(<AccountSettings userId="u_1" email="you@acme.test" role="user" />);
    expect(screen.getByTestId('account-settings')).toBeInTheDocument();
    expect(screen.getByTestId('danger-zone')).toBeInTheDocument();
    expect(screen.getByTestId('account-delete')).toBeInTheDocument();
    expect(screen.getByText('you@acme.test')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AccountSettings userId="u_1" email="you@acme.test" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
