import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { LayoutVariantFallback } from './LayoutVariantFallback.tsx';

describe('LayoutVariantFallback', () => {
  it('renders the full-page spinner while a layout variant chunk loads', () => {
    render(<LayoutVariantFallback />);
    expect(screen.getByTestId('full-page-spinner')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LayoutVariantFallback />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
