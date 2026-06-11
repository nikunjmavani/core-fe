import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Ordered steps of the post-signup onboarding wizard. */
export const ONBOARDING_STEPS = [
  'welcome',
  'profile',
  'workspace',
  'invite',
  'done',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Data collected across the onboarding wizard (persisted so it is resumable). */
export interface OnboardingData {
  fullName: string;
  jobTitle: string;
  organizationName: string;
  organizationSlug: string;
  invites: string[];
}

interface OnboardingStore {
  /** Current step index into {@link ONBOARDING_STEPS}. */
  stepIndex: number;
  data: OnboardingData;
  completed: boolean;

  setStepIndex: (index: number) => void;
  next: () => void;
  back: () => void;
  patch: (data: Partial<OnboardingData>) => void;
  complete: () => void;
  reset: () => void;
}

const INITIAL_DATA: OnboardingData = {
  fullName: '',
  jobTitle: '',
  organizationName: '',
  organizationSlug: '',
  invites: [],
};

/**
 * Client-side onboarding progress. Persisted to localStorage so a user can
 * close the tab mid-flow and resume where they left off. This is UI/session
 * state only — the final submission goes through the API.
 */
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      stepIndex: 0,
      data: INITIAL_DATA,
      completed: false,

      setStepIndex: (stepIndex) => set({ stepIndex }),
      next: () =>
        set((s) => ({
          stepIndex: Math.min(s.stepIndex + 1, ONBOARDING_STEPS.length - 1),
        })),
      back: () => set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0) })),
      patch: (data) => set((s) => ({ data: { ...s.data, ...data } })),
      complete: () => set({ completed: true }),
      reset: () => set({ stepIndex: 0, data: INITIAL_DATA, completed: false }),
    }),
    { name: 'core-onboarding' },
  ),
);
