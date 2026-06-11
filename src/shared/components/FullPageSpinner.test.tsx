import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { FullPageSpinner } from './FullPageSpinner.tsx';

describe('FullPageSpinner', () => {
  it('renders with data-testid="full-page-spinner"', () => {
    render(<FullPageSpinner />);
    expect(screen.getByTestId('full-page-spinner')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FullPageSpinner />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
