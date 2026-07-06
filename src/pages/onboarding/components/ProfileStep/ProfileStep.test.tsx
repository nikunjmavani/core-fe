import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { ProfileStep } from './ProfileStep.tsx';

describe('ProfileStep', () => {
  it('patches the first and last name into the onboarding store', async () => {
    const user = userEvent.setup();
    render(<ProfileStep />);
    await user.type(screen.getByTestId('onboarding-first-name'), 'Ada');
    await user.type(screen.getByTestId('onboarding-last-name'), 'Lovelace');
    expect(useOnboardingStore.getState().data.firstName).toContain('Ada');
    expect(useOnboardingStore.getState().data.lastName).toContain('Lovelace');
  });
});
