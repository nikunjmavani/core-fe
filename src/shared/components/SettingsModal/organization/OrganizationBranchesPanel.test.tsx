import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationBranchesPanel } from './OrganizationBranchesPanel.tsx';

describe('OrganizationBranchesPanel', () => {
  it('renders the panel', () => {
    render(<OrganizationBranchesPanel />);
    expect(screen.getByTestId('settings-organization-branches')).toBeInTheDocument();
  });
});
