import { beforeEach, describe, expect, it } from 'vitest';

import { ONBOARDING_STEPS, useOnboardingStore } from './useOnboardingStore.ts';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('starts at the first step with empty data', () => {
    const state = useOnboardingStore.getState();
    expect(state.stepIndex).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.data.fullName).toBe('');
  });

  it('advances and clamps at the last step', () => {
    const { next } = useOnboardingStore.getState();
    for (let i = 0; i < ONBOARDING_STEPS.length + 3; i++) next();
    expect(useOnboardingStore.getState().stepIndex).toBe(ONBOARDING_STEPS.length - 1);
  });

  it('goes back and clamps at zero', () => {
    useOnboardingStore.getState().setStepIndex(2);
    useOnboardingStore.getState().back();
    expect(useOnboardingStore.getState().stepIndex).toBe(1);
    useOnboardingStore.getState().back();
    useOnboardingStore.getState().back();
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
  });

  it('patches data and marks complete', () => {
    useOnboardingStore.getState().patch({ fullName: 'Ada', jobTitle: 'Engineer' });
    useOnboardingStore.getState().complete();
    const state = useOnboardingStore.getState();
    expect(state.data.fullName).toBe('Ada');
    expect(state.data.jobTitle).toBe('Engineer');
    expect(state.completed).toBe(true);
  });
});
