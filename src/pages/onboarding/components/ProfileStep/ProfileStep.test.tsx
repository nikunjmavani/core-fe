import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { ProfileStep } from './ProfileStep.tsx';

describe('ProfileStep', () => {
  it('patches the full name into the onboarding store', async () => {
    const user = userEvent.setup();
    render(<ProfileStep />);
    await user.type(screen.getByTestId('onboarding-fullname'), 'Ada');
    expect(useOnboardingStore.getState().data.fullName).toContain('Ada');
  });
});
