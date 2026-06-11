import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountNotificationsPanel } from './AccountNotificationsPanel.tsx';

describe('AccountNotificationsPanel', () => {
  it('renders the panel', () => {
    render(<AccountNotificationsPanel />);
    expect(screen.getByTestId('settings-section-notifications')).toBeInTheDocument();
  });
});
