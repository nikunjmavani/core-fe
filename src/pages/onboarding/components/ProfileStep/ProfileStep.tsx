import { useTranslation } from 'react-i18next';

import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import {
  ONBOARDING_KEYS,
  ONBOARDING_NS,
  ONBOARDING_TEST_IDS,
} from '../../onboarding.constants.ts';

/** Collects the user's name + job title into the onboarding store. */
export function ProfileStep() {
  const { t } = useTranslation(ONBOARDING_NS);
  const { data, patch } = useOnboardingStore();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-name">{t(ONBOARDING_KEYS.profile.fullNameLabel)}</Label>
        <Input
          id="ob-name"
          value={data.fullName}
          onChange={(e) => patch({ fullName: e.target.value })}
          placeholder={t(ONBOARDING_KEYS.profile.fullNamePlaceholder)}
          data-testid={ONBOARDING_TEST_IDS.fullName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-title">{t(ONBOARDING_KEYS.profile.jobTitleLabel)}</Label>
        <Input
          id="ob-title"
          value={data.jobTitle}
          onChange={(e) => patch({ jobTitle: e.target.value })}
          placeholder={t(ONBOARDING_KEYS.profile.jobTitlePlaceholder)}
          data-testid={ONBOARDING_TEST_IDS.jobTitle}
        />
      </div>
    </div>
  );
}
