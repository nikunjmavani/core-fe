import { useEffect } from 'react';

import { organizationNameFromEmail } from '@/lib/onboarding-defaults.ts';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';
import { deriveOrganizationSlug } from '@/shared/tenancy/my-organizations.ts';

/** Names the organization that the final step will create. */
export function WorkspaceStep() {
  const { data, patch } = useOnboardingStore();
  const email = useAuthStore((s) => s.user?.email);

  // Prefill the org name from a work-email domain — once email is known, and
  // never over something the user already typed. Reads/writes the store via
  // getState() so the effect depends only on `email` (no churn per keystroke,
  // and nothing for the exhaustive-deps linters to flag).
  useEffect(() => {
    const store = useOnboardingStore.getState();
    if (store.data.organizationName) return;
    const suggested = email ? organizationNameFromEmail(email) : null;
    if (suggested) store.patch({ organizationName: suggested });
  }, [email]);

  // What the final URL will actually be (mirrors createOrganization's logic).
  const previewSlug =
    data.organizationSlug.trim() ||
    deriveOrganizationSlug(data.organizationName) ||
    'your-workspace';

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
        <p className="text-muted-foreground text-xs" data-testid="onboarding-url-preview">
          Your workspace will live at{' '}
          <span className="text-foreground font-medium">core.app/{previewSlug}</span>
        </p>
      </div>
    </div>
  );
}
