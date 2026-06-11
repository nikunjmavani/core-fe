import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { organizationDashboard } from '@/lib/routes/index.ts';
import { createInvitation } from '@/shared/api/organization-api.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
} from '@/shared/store/useOnboardingStore/index.ts';
import { createOrganization } from '@/shared/tenancy/my-organizations.ts';

import { DoneStep } from './components/DoneStep/index.ts';
import { InviteStep } from './components/InviteStep/index.ts';
import { ProfileStep } from './components/ProfileStep/index.ts';
import { StepIndicator } from './components/StepIndicator/index.ts';
import { WelcomeStep } from './components/WelcomeStep/index.ts';
import { WorkspaceStep } from './components/WorkspaceStep/index.ts';

const STEP_META: Record<
  (typeof ONBOARDING_STEPS)[number],
  { title: string; description: string }
> = {
  welcome: {
    title: 'Welcome aboard',
    description: "Let's set up your account in a few quick steps.",
  },
  profile: { title: 'About you', description: 'Tell us a little about yourself.' },
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
 * `$organizationId` guard syncs context, persists, and loads permissions).
 * Step UIs live in `components/` (folder-per-unit).
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const { stepIndex, data, next, back, complete } = useOnboardingStore();
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
      const org = await createOrganization({
        name: data.organizationName.trim() || 'My organization',
        slug: data.organizationSlug.trim() || undefined,
      });

      await Promise.all(
        data.invites.map((email) => createInvitation({ email, role: 'member' })),
      );

      complete();
      toast.success('Welcome! Your workspace is ready.');
      // The $organizationId guard syncs context, persists, and loads permissions.
      void navigate({ ...organizationDashboard(org.id), replace: true });
    } catch {
      toast.error('Something went wrong finishing setup. Please try again.');
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
