import { useTranslation } from 'react-i18next';

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { ONBOARDING_KEYS, ONBOARDING_NS } from '../../onboarding.constants.ts';

/** Review summary shown before the final "Enter dashboard" action. */
export function DoneStep() {
  const { t } = useTranslation(ONBOARDING_NS);
  const { data } = useOnboardingStore();
  const empty = t(ONBOARDING_KEYS.done.emptyValue);

  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t(ONBOARDING_KEYS.done.nameLabel)}</dt>
        <dd className="font-medium">{data.fullName || empty}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">
          {t(ONBOARDING_KEYS.done.organizationLabel)}
        </dt>
        <dd className="font-medium">{data.organizationName || empty}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t(ONBOARDING_KEYS.done.invitesLabel)}</dt>
        <dd className="font-medium">
          {t(ONBOARDING_KEYS.done.invitesPending, { count: data.invites.length })}
        </dd>
      </div>
    </dl>
  );
}
