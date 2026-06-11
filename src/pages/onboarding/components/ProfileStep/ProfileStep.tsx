import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

/** Collects the user's name + job title into the onboarding store. */
export function ProfileStep() {
  const { data, patch } = useOnboardingStore();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-name">Full name</Label>
        <Input
          id="ob-name"
          value={data.fullName}
          onChange={(e) => patch({ fullName: e.target.value })}
          placeholder="Ada Lovelace"
          data-testid="onboarding-fullname"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-title">Job title</Label>
        <Input
          id="ob-title"
          value={data.jobTitle}
          onChange={(e) => patch({ jobTitle: e.target.value })}
          placeholder="Engineering Lead"
          data-testid="onboarding-jobtitle"
        />
      </div>
    </div>
  );
}
