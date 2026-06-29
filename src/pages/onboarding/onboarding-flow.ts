import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/shared/store/useOnboardingStore/index.ts';
import {
  type DeploymentFlags,
  resolveDeploymentMode,
} from '@/shared/tenancy/deployment-mode.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';

export type { OnboardingStep };

function hasTeamOrganization(ctx: MeContext | null | undefined): boolean {
  if (!ctx) return false;
  return ctx.organizations.some((o) => o.type === 'TEAM');
}

/** Steps shown for this deployment mode + current org inventory. */
export function deriveOnboardingSteps(
  flags: DeploymentFlags,
  ctx: MeContext | null | undefined,
): readonly OnboardingStep[] {
  const mode = resolveDeploymentMode(flags);
  const hasTeam = hasTeamOrganization(ctx);

  const steps: OnboardingStep[] = ['welcome', 'profile', 'questions'];

  if (mode === 'team-only') steps.push('workspace');

  if (mode === 'team-only' || (mode === 'personal-and-team' && hasTeam)) {
    steps.push('invite');
  }

  steps.push('done');
  return steps;
}

/** Whether the finish step should create a team org via API. */
export function shouldCreateOrganizationOnFinish(
  flags: DeploymentFlags,
  _ctx: MeContext | null | undefined,
): boolean {
  const mode = resolveDeploymentMode(flags);
  if (mode === 'personal-only') return false;
  if (mode === 'team-only') return true;
  // Both: personal workspace is auto-provisioned on signup; team orgs are created
  // later from the organization switcher.
  return false;
}

export function clampStepIndex(index: number, steps: readonly OnboardingStep[]): number {
  return Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0));
}

export function stepAtIndex(
  index: number,
  steps: readonly OnboardingStep[],
): OnboardingStep {
  const clamped = clampStepIndex(index, steps);
  // eslint-disable-next-line security/detect-object-injection -- clamped index is bounded
  return steps[clamped] ?? ONBOARDING_STEPS[0] ?? 'welcome';
}
