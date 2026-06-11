import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WelcomeStep } from './WelcomeStep.tsx';

describe('WelcomeStep', () => {
  it('renders the setup pitch', () => {
    render(<WelcomeStep />);
    expect(screen.getByText(/set up your profile/i)).toBeInTheDocument();
  });
});
