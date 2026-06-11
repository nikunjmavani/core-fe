import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationMembersPanel } from './OrganizationMembersPanel.tsx';

describe('OrganizationMembersPanel', () => {
  it('renders the panel', () => {
    render(<OrganizationMembersPanel />);
    expect(screen.getByTestId('settings-organization-members')).toBeInTheDocument();
  });
});
