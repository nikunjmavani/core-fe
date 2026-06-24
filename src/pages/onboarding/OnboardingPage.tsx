import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { organizationDashboard } from '@/lib/routes/index.ts';
import { authApi } from '@/shared/api/auth-api.ts';
import { createInvitation } from '@/shared/api/organization-api.ts';
import { getAccessToken } from '@/shared/auth/token.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Loader2 } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
} from '@/shared/store/useOnboardingStore/index.ts';
import { createOrganization } from '@/shared/tenancy/my-organizations.ts';

import { DoneStep } from './components/DoneStep/index.ts';
import { InviteStep } from './components/InviteStep/index.ts';
import { ProfileStep } from './components/ProfileStep/index.ts';
import { QuestionsStep } from './components/QuestionsStep/index.ts';
import { StepIndicator } from './components/StepIndicator/index.ts';
import { WelcomeStep } from './components/WelcomeStep/index.ts';
import { WorkspaceStep } from './components/WorkspaceStep/index.ts';

/**
 * Persist the collected profile + fire a segmentation event. Best-effort by
 * contract — every failure is swallowed so it can never strand the user on
 * the onboarding screen. The survey answers are analytics only (not PII we
 * store server-side); name + job title update the user's profile.
 */
async function persistOnboardingResult(input: {
  fullName: string;
  jobTitle: string;
  teamSize: string;
  primaryUseCase: string;
  referralSource: string;
  invitedCount: number;
}): Promise<void> {
  const fullName = input.fullName.trim();
  const jobTitle = input.jobTitle.trim();
  const token = getAccessToken();
  if (token && (fullName || jobTitle)) {
    try {
      await authApi.updateProfile(
        { name: fullName || undefined, jobTitle: jobTitle || undefined },
        token,
      );
      const user = useAuthStore.getState().user;
      if (user && fullName) useAuthStore.getState().setUser({ ...user, name: fullName });
    } catch {
      /* profile update is best-effort */
    }
  }

  try {
    const { default: posthog } = await import('posthog-js');
    if (posthog.__loaded) {
      posthog.capture('onboarding_completed', {
        team_size: input.teamSize || undefined,
        primary_use_case: input.primaryUseCase || undefined,
        referral_source: input.referralSource || undefined,
        invited_count: input.invitedCount,
      });
    }
  } catch {
    /* analytics must never break onboarding */
  }
}

const STEP_META: Record<
  (typeof ONBOARDING_STEPS)[number],
  { title: string; description: string }
> = {
  welcome: {
    title: 'Welcome aboard',
    description: "Let's set up your account in a few quick steps.",
  },
  profile: { title: 'About you', description: 'Tell us a little about yourself.' },
  questions: {
    title: 'A few quick questions',
    description: 'Optional — this helps us tailor your workspace.',
  },
  workspace: {
    title: 'Your workspace',
    description: 'Name the organization you want to create.',
  },
  invite: {
    title: 'Invite your team',
    description: 'Add teammates now or skip and do it later.',
  },
  done: { title: "You're all set", description: 'Review and jump into your dashboard.' },
};

function renderStep(step: (typeof ONBOARDING_STEPS)[number]) {
  switch (step) {
    case 'profile':
      return <ProfileStep />;
    case 'questions':
      return <QuestionsStep />;
    case 'workspace':
      return <WorkspaceStep />;
    case 'invite':
      return <InviteStep />;
    case 'done':
      return <DoneStep />;
    default:
      return <WelcomeStep />;
  }
}

/**
 * Multi-step, resumable onboarding wizard. Progress is persisted in
 * {@link useOnboardingStore}; the final step creates the organization, sends any
 * invitations, and navigates to the new organization's dashboard (the
 * `$organizationSlug` guard syncs context, persists, and loads permissions).
 * Step UIs live in `components/` (folder-per-unit).
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    stepIndex,
    data,
    next,
    back,
    complete,
    createdOrganizationId,
    setCreatedOrganizationId,
    createdOrganizationSlug,
    setCreatedOrganizationSlug,
  } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line security/detect-object-injection -- stepIndex is clamped store state
  const step = ONBOARDING_STEPS[stepIndex] ?? 'welcome';
  // eslint-disable-next-line security/detect-object-injection -- step is a constrained union
  const meta = STEP_META[step];

  const canProceed =
    (step !== 'workspace' || data.organizationName.trim().length > 0) &&
    (step !== 'profile' || data.fullName.trim().length > 0);

  const finish = async () => {
    setSubmitting(true);
    try {
      // Idempotent: if a prior attempt already created the org (and then an
      // invite failed), reuse it instead of creating a DUPLICATE on retry.
      let organizationSlug = createdOrganizationSlug;
      if (!createdOrganizationId) {
        const org = await createOrganization({
          name: data.organizationName.trim() || 'My organization',
          slug: data.organizationSlug.trim() || undefined,
        });
        organizationSlug = org.slug;
        setCreatedOrganizationId(org.id);
        setCreatedOrganizationSlug(org.slug);
      }

      // Profile + segmentation are fire-and-forget: never block dashboard entry.
      void persistOnboardingResult({
        fullName: data.fullName,
        jobTitle: data.jobTitle,
        teamSize: data.teamSize,
        primaryUseCase: data.primaryUseCase,
        referralSource: data.referralSource,
        invitedCount: data.invites.length,
      });

      // Invites are best-effort: one bad address must not strand the user with
      // an already-created org they can't get past.
      const results = await Promise.allSettled(
        data.invites.map((email) => createInvitation({ email, role: 'member' })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;

      complete();
      if (failed > 0) {
        notify.warning(
          `Workspace ready — ${failed} invite${failed > 1 ? 's' : ''} couldn't be sent. You can resend from Members.`,
        );
      } else {
        notify.success('Welcome! Your workspace is ready.');
      }
      // The $organizationSlug guard syncs context, persists, and loads permissions.
      if (organizationSlug) {
        void navigate({ ...organizationDashboard(organizationSlug), replace: true });
      } else {
        void navigate({ to: '/', replace: true });
      }
    } catch {
      notify.error('Something went wrong finishing setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="bg-muted/30 flex min-h-screen items-center justify-center p-4"
      data-testid="onboarding-page"
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <StepIndicator current={stepIndex} />
          <div>
            <CardTitle data-testid="onboarding-step-title">{meta.title}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep(step)}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={back}
              disabled={stepIndex === 0 || submitting}
              data-testid="onboarding-back"
            >
              Back
            </Button>

            {step === 'done' ? (
              <Button
                onClick={finish}
                disabled={submitting}
                data-testid="onboarding-finish"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  'Enter dashboard'
                )}
              </Button>
            ) : (
              <Button onClick={next} disabled={!canProceed} data-testid="onboarding-next">
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
