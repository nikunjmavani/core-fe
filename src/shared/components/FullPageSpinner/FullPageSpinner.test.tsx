import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { FullPageSpinner } from './FullPageSpinner.tsx';

describe('FullPageSpinner', () => {
  it('renders with data-testid="full-page-spinner" when boot splash is gone', () => {
    render(<FullPageSpinner />);
    expect(screen.getByTestId('full-page-spinner')).toBeInTheDocument();
  });

  it('renders nothing while the HTML boot splash is still active', () => {
    const splash = document.createElement('div');
    splash.id = 'app-splash';
    document.body.prepend(splash);

    render(<FullPageSpinner />);
    expect(screen.queryByTestId('full-page-spinner')).not.toBeInTheDocument();

    splash.remove();
    window.dispatchEvent(new CustomEvent('app-splash-dismissed'));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FullPageSpinner />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
