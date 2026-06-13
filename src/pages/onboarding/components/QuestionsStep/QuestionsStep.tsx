import { cn } from '@/lib/utils.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'] as const;
const USE_CASES = [
  'Customer management',
  'Team collaboration',
  'Analytics & reporting',
  'Internal tools',
  'Something else',
] as const;
const REFERRAL_SOURCES = [
  'Search',
  'Social media',
  'Friend or colleague',
  'Blog or article',
  'Other',
] as const;

/**
 * Single-select chip group built as toggle buttons (`aria-pressed`) inside a
 * native `fieldset`/`legend`. Toggle buttons — not `role="radio"`/native radios
 * — because the choices are optional: clicking the active chip clears it, which
 * a radio cannot do.
 */
function ChoiceGroup({
  label,
  options,
  value,
  onSelect,
  testId,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  testId: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" data-testid={testId}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? '' : option)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input text-foreground hover:bg-muted',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Optional qualifying questions (team size, primary use case, referral). All
 * skippable — they segment the user and seed smart defaults, never gate the
 * flow. Answers are captured for analytics on finish (not stored server-side).
 */
export function QuestionsStep() {
  const { data, patch } = useOnboardingStore();
  return (
    <div className="space-y-5">
      <ChoiceGroup
        label="How big is your team?"
        options={TEAM_SIZES}
        value={data.teamSize}
        onSelect={(teamSize) => patch({ teamSize })}
        testId="onboarding-team-size"
      />
      <ChoiceGroup
        label="What will you mainly use Core for?"
        options={USE_CASES}
        value={data.primaryUseCase}
        onSelect={(primaryUseCase) => patch({ primaryUseCase })}
        testId="onboarding-use-case"
      />
      <ChoiceGroup
        label="How did you hear about us?"
        options={REFERRAL_SOURCES}
        value={data.referralSource}
        onSelect={(referralSource) => patch({ referralSource })}
        testId="onboarding-referral"
      />
    </div>
  );
}
