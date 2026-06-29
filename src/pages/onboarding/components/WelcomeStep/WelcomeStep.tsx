import { useTranslation } from 'react-i18next';

import { Rocket } from '@/shared/icons/index.ts';

import { ONBOARDING_KEYS, ONBOARDING_NS } from '../../onboarding.constants.ts';

/** First onboarding step — short pitch for the setup flow. */
export function WelcomeStep() {
  const { t } = useTranslation(ONBOARDING_NS);
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
        <Rocket className="text-primary h-7 w-7" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">
        {t(ONBOARDING_KEYS.welcome.body)}
      </p>
    </div>
  );
}
