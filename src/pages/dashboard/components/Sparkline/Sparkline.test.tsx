import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Sparkline } from './Sparkline.tsx';

describe('Sparkline', () => {
  it('renders a decorative (aria-hidden) sparkline container', () => {
    render(<Sparkline id="users" data={[1, 4, 3, 8, 12]} trend="up" />);
    const el = screen.getByTestId('sparkline-users');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Sparkline id="revenue" data={[10, 8, 6, 5]} trend="down" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
