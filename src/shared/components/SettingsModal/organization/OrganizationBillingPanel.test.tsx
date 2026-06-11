import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationBillingPanel } from './OrganizationBillingPanel.tsx';

describe('OrganizationBillingPanel', () => {
  it('renders the panel', () => {
    render(<OrganizationBillingPanel />);
    expect(screen.getByTestId('settings-organization-billing')).toBeInTheDocument();
  });
});
