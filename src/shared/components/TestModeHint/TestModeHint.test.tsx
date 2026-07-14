import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

vi.mock('@/core/config/env.ts', () => ({
  platformConfig: { testMode: false, debugLogging: true },
}));

import { platformConfig } from '@/core/config/env.ts';

import { TestModeHint } from './TestModeHint.tsx';

const cfg = platformConfig as unknown as { testMode: boolean; debugLogging: boolean };

afterEach(() => {
  cfg.testMode = false;
  cfg.debugLogging = true;
  globalThis.sessionStorage?.clear();
});

describe('TestModeHint', () => {
  it('shows the hint when test mode is off and debug logging is on', () => {
    render(<TestModeHint />);
    expect(screen.getByTestId('test-mode-hint')).toBeInTheDocument();
  });

  it('renders nothing when test mode is on', () => {
    cfg.testMode = true;
    render(<TestModeHint />);
    expect(screen.queryByTestId('test-mode-hint')).not.toBeInTheDocument();
  });

  it('renders nothing when debug logging is off (proxy for non-dev)', () => {
    cfg.debugLogging = false;
    render(<TestModeHint />);
    expect(screen.queryByTestId('test-mode-hint')).not.toBeInTheDocument();
  });

  it('dismisses and stays dismissed for the session', async () => {
    render(<TestModeHint />);
    await userEvent.click(screen.getByTestId('test-mode-hint-dismiss'));
    expect(screen.queryByTestId('test-mode-hint')).not.toBeInTheDocument();
    expect(globalThis.sessionStorage.getItem('test-mode-hint-dismissed')).toBe('1');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TestModeHint />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
