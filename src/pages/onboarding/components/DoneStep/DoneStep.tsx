import { useTranslation } from 'react-i18next';

import { useDeploymentFlags } from '@/shared/hooks/useDeploymentFlags/index.ts';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

import { ONBOARDING_KEYS, ONBOARDING_NS } from '../../onboarding.constants.ts';
import { deriveOnboardingSteps } from '../../onboarding-flow.ts';

/**
 * Review summary shown before the final "Enter dashboard" action. Only rows
 * this flow actually collected are shown: `organizationName` exists only when
 * the `workspace` step ran (team-only mode) and invites only when the `invite`
 * step ran — rendering them unconditionally showed a dangling "Organization: —"
 * in personal/hybrid flows that never asked for one.
 */
export function DoneStep() {
  const { t } = useTranslation(ONBOARDING_NS);
  const { data } = useOnboardingStore();
  const deploymentFlags = useDeploymentFlags();
  const { data: meContext } = useMeContext();
  const steps = deriveOnboardingSteps(deploymentFlags, meContext ?? null);
  const empty = t(ONBOARDING_KEYS.done.emptyValue);

  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t(ONBOARDING_KEYS.done.nameLabel)}</dt>
        <dd className="font-medium">
          {[data.firstName, data.lastName].filter(Boolean).join(' ') || empty}
        </dd>
      </div>
      {steps.includes('workspace') ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {t(ONBOARDING_KEYS.done.organizationLabel)}
          </dt>
          <dd className="font-medium">{data.organizationName || empty}</dd>
        </div>
      ) : null}
      {steps.includes('invite') ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {t(ONBOARDING_KEYS.done.invitesLabel)}
          </dt>
          <dd className="font-medium">
            {t(ONBOARDING_KEYS.done.invitesPending, { count: data.invites.length })}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
