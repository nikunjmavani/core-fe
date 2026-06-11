import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountProfilePanel } from './AccountProfilePanel.tsx';

describe('AccountProfilePanel', () => {
  it('renders the panel', () => {
    render(<AccountProfilePanel />);
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
  });
});
