import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepIndicator } from './StepIndicator.tsx';

describe('StepIndicator', () => {
  it('marks the current step with aria-current', () => {
    render(<StepIndicator current={1} />);
    const current = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('[aria-current="step"]'))
      .filter(Boolean);
    expect(current).toHaveLength(1);
  });
});
