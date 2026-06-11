import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationRolesPanel } from './OrganizationRolesPanel.tsx';

describe('OrganizationRolesPanel', () => {
  it('renders the panel', () => {
    render(<OrganizationRolesPanel />);
    expect(screen.getByTestId('settings-organization-roles')).toBeInTheDocument();
  });
});
