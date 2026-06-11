import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountSessionsPanel } from './AccountSessionsPanel.tsx';

describe('AccountSessionsPanel', () => {
  it('renders the panel', () => {
    render(<AccountSessionsPanel />);
    expect(screen.getByTestId('settings-account-sessions')).toBeInTheDocument();
  });
});
