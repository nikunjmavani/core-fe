import { Check } from 'lucide-react';

import { ONBOARDING_STEPS } from '@/shared/store/useOnboardingStore/index.ts';

type StepState = 'done' | 'current' | 'upcoming';

function stepState(index: number, current: number): StepState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'upcoming';
}

function stepCircleClass(state: StepState): string {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full text-xs';
  if (state === 'done') return `bg-primary text-primary-foreground ${base}`;
  if (state === 'current')
    return `border-primary text-primary border font-medium ${base}`;
  return `border-muted text-muted-foreground border ${base}`;
}

/** Numbered progress dots across the top of the onboarding card. */
export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {ONBOARDING_STEPS.map((step, i) => {
        const state = stepState(i, current);
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={stepCircleClass(state)}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            {i < ONBOARDING_STEPS.length - 1 && (
              <span className="bg-border h-px w-6" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
