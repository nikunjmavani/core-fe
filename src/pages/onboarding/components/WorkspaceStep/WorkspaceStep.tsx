import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

/** Names the organization that the final step will create. */
export function WorkspaceStep() {
  const { data, patch } = useOnboardingStore();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-org">Organization name</Label>
        <Input
          id="ob-org"
          value={data.organizationName}
          onChange={(e) => patch({ organizationName: e.target.value })}
          placeholder="Acme Inc."
          data-testid="onboarding-organization-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-slug">Workspace URL (optional)</Label>
        <Input
          id="ob-slug"
          value={data.organizationSlug}
          onChange={(e) => patch({ organizationSlug: e.target.value })}
          placeholder="acme"
          data-testid="onboarding-organization-slug"
        />
      </div>
    </div>
  );
}
