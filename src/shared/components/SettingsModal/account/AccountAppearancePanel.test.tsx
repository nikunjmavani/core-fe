import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountAppearancePanel } from './AccountAppearancePanel.tsx';

describe('AccountAppearancePanel', () => {
  it('renders the panel', () => {
    render(<AccountAppearancePanel />);
    expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
  });
});
