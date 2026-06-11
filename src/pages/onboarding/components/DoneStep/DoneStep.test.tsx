import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { DoneStep } from './DoneStep.tsx';

describe('DoneStep', () => {
  it('summarizes the collected onboarding data', () => {
    useOnboardingStore.getState().patch({ organizationName: 'Acme Inc.' });
    render(<DoneStep />);
    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
  });
});
