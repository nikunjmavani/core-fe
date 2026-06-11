import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionHeader } from './SettingsPanelShell.tsx';

describe('SectionHeader', () => {
  it('renders title, description, and meta', () => {
    render(<SectionHeader title="Profile" description="Your details" meta="80%" />);
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Your details')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
