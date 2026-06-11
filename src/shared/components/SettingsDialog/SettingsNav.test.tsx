import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsNav } from './SettingsNav.tsx';

describe('SettingsNav', () => {
  it('renders all top-level sections', () => {
    render(<SettingsNav section="profile" onSectionChange={vi.fn()} />);
    expect(screen.getByTestId('settings-nav-profile')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-account')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-security')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-org-general')).toBeInTheDocument();
  });

  it('marks the active section with aria-current="page"', () => {
    render(<SettingsNav section="security" onSectionChange={vi.fn()} />);
    expect(screen.getByTestId('settings-nav-security')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByTestId('settings-nav-profile')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('calls onSectionChange when a nav button is clicked', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    render(<SettingsNav section="profile" onSectionChange={onSectionChange} />);
    await user.click(screen.getByTestId('settings-nav-appearance'));
    expect(onSectionChange).toHaveBeenCalledWith('appearance');
  });

  it('filters nav items by the search query', async () => {
    const user = userEvent.setup();
    render(<SettingsNav section="profile" onSectionChange={vi.fn()} />);
    await user.type(screen.getByTestId('settings-search'), 'passkey');
    expect(screen.getByTestId('settings-nav-security')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-nav-appearance')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-nav-profile')).not.toBeInTheDocument();
  });

  it('shows an empty state when no items match', async () => {
    const user = userEvent.setup();
    render(<SettingsNav section="profile" onSectionChange={vi.fn()} />);
    await user.type(screen.getByTestId('settings-search'), 'zzznomatch');
    expect(screen.getByTestId('settings-nav-empty')).toBeInTheDocument();
  });
});
