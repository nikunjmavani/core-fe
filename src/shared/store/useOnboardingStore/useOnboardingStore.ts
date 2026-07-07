import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Ordered steps of the post-signup onboarding wizard. */
export const ONBOARDING_STEPS = [
  'welcome',
  'profile',
  'questions',
  'workspace',
  'invite',
  'done',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Data collected across the onboarding wizard (persisted so it is resumable). */
interface OnboardingData {
  /** Profile name — split fields mirror core-be `first_name` / `last_name`. */
  firstName: string;
  lastName: string;
  /** Qualifying questions — drive segmentation + smart defaults. */
  teamSize: string;
  primaryUseCase: string;
  referralSource: string;
  organizationName: string;
  organizationSlug: string;
  invites: string[];
}

interface OnboardingStore {
  /** Current step index into {@link ONBOARDING_STEPS}. */
  stepIndex: number;
  data: OnboardingData;
  completed: boolean;
  /**
   * Id of the organization created by the finish step, if any. Set the moment
   * creation succeeds so a partial failure (e.g. an invite rejects) never
   * re-creates a DUPLICATE org when the user retries — the retry reuses this.
   */
  createdOrganizationId: string | null;
  /**
   * Slug of the created org (mirrors {@link createdOrganizationId}) — drives the
   * post-onboarding navigation to the team's `/organization/$organizationSlug/*`
   * space (FE-22). Kept alongside the id so a retry after a partial failure
   * still knows where to land.
   */
  createdOrganizationSlug: string | null;

  setStepIndex: (index: number) => void;
  next: () => void;
  back: () => void;
  patch: (data: Partial<OnboardingData>) => void;
  setCreatedOrganizationId: (id: string | null) => void;
  setCreatedOrganizationSlug: (slug: string | null) => void;
  complete: () => void;
  reset: () => void;
}

const INITIAL_DATA: OnboardingData = {
  firstName: '',
  lastName: '',
  teamSize: '',
  primaryUseCase: '',
  referralSource: '',
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
      createdOrganizationId: null,
      createdOrganizationSlug: null,

      setStepIndex: (stepIndex) => set({ stepIndex }),
      next: () =>
        set((s) => ({
          stepIndex: Math.min(s.stepIndex + 1, ONBOARDING_STEPS.length - 1),
        })),
      back: () => set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0) })),
      patch: (data) => set((s) => ({ data: { ...s.data, ...data } })),
      setCreatedOrganizationId: (createdOrganizationId) => set({ createdOrganizationId }),
      setCreatedOrganizationSlug: (createdOrganizationSlug) =>
        set({ createdOrganizationSlug }),
      complete: () => set({ completed: true }),
      reset: () =>
        set({
          stepIndex: 0,
          data: INITIAL_DATA,
          completed: false,
          createdOrganizationId: null,
          createdOrganizationSlug: null,
        }),
    }),
    { name: 'core-onboarding' },
  ),
);
