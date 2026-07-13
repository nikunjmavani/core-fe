import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { SectionErrorBoundary } from './WidgetErrorBoundary.tsx';

function Boom(): never {
  throw new Error('widget failed');
}

describe('SectionErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <SectionErrorBoundary title="Test">
        <p>OK</p>
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows a retryable fallback when a child throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <SectionErrorBoundary title="Analytics" testId="widget-error-analytics">
        <Boom />
      </SectionErrorBoundary>,
    );
    expect(screen.getByTestId('widget-error-analytics')).toBeInTheDocument();
    expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    spy.mockRestore();
  });

  it('has no accessibility violations in fallback state', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <SectionErrorBoundary title="Stats">
        <Boom />
      </SectionErrorBoundary>,
    );
    expect(await axe(container)).toHaveNoViolations();
    spy.mockRestore();
  });
});
