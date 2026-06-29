import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { organizationNameFromEmail } from '@/lib/onboarding-defaults.ts';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';
import { deriveOrganizationSlug } from '@/shared/tenancy/my-organizations.ts';

import {
  ONBOARDING_KEYS,
  ONBOARDING_NS,
  ONBOARDING_TEST_IDS,
} from '../../onboarding.constants.ts';

/** Names the organization that the final step will create. */
export function WorkspaceStep() {
  const { t } = useTranslation(ONBOARDING_NS);
  const { data, patch } = useOnboardingStore();
  const email = useAuthStore((s) => s.user?.email);

  useEffect(() => {
    const store = useOnboardingStore.getState();
    if (store.data.organizationName) return;
    const suggested = email ? organizationNameFromEmail(email) : null;
    if (suggested) store.patch({ organizationName: suggested });
  }, [email]);

  const previewSlug =
    data.organizationSlug.trim() ||
    deriveOrganizationSlug(data.organizationName) ||
    t(ONBOARDING_KEYS.workspace.slugFallback);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-org">
          {t(ONBOARDING_KEYS.workspace.organizationNameLabel)}
        </Label>
        <Input
          id="ob-org"
          value={data.organizationName}
          onChange={(e) => patch({ organizationName: e.target.value })}
          placeholder={t(ONBOARDING_KEYS.workspace.organizationNamePlaceholder)}
          data-testid={ONBOARDING_TEST_IDS.organizationName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-slug">{t(ONBOARDING_KEYS.workspace.slugLabel)}</Label>
        <Input
          id="ob-slug"
          value={data.organizationSlug}
          onChange={(e) => patch({ organizationSlug: e.target.value })}
          placeholder={t(ONBOARDING_KEYS.workspace.slugPlaceholder)}
          data-testid={ONBOARDING_TEST_IDS.organizationSlug}
        />
        <p
          className="text-muted-foreground text-xs"
          data-testid={ONBOARDING_TEST_IDS.urlPreview}
        >
          <Trans
            ns={ONBOARDING_NS}
            i18nKey={ONBOARDING_KEYS.workspace.urlPreview}
            values={{ slug: previewSlug }}
            components={{
              1: <span className="text-foreground font-medium" />,
            }}
          />
        </p>
      </div>
    </div>
  );
}
