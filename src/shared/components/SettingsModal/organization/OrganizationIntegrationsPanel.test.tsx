import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationIntegrationsPanel } from './OrganizationIntegrationsPanel.tsx';

describe('OrganizationIntegrationsPanel', () => {
  it('renders the panel', () => {
    render(<OrganizationIntegrationsPanel />);
    expect(screen.getByTestId('settings-organization-integrations')).toBeInTheDocument();
  });
});
