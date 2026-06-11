import { useNavigate } from '@tanstack/react-router';
import { Check, Loader2, Plus, Rocket, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createOrganization } from '@/shared/api/my-orgs.ts';
import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { createInvitation } from '@/shared/api/organization-api.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
} from '@/shared/store/useOnboardingStore/index.ts';
import {
  persistTenantToStorage,
  useTenantStore,
} from '@/shared/store/useTenantStore/index.ts';

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

type StepState = 'done' | 'current' | 'upcoming';

function stepState(index: number, current: number): StepState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'upcoming';
}

function stepCircleClass(state: StepState): string {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full text-xs';
  if (state === 'done') return `bg-primary text-primary-foreground ${base}`;
  if (state === 'current')
    return `border-primary text-primary border font-medium ${base}`;
  return `border-muted text-muted-foreground border ${base}`;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {ONBOARDING_STEPS.map((step, i) => {
        const state = stepState(i, current);
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={stepCircleClass(state)}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            {i < ONBOARDING_STEPS.length - 1 && (
              <span className="bg-border h-px w-6" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProfileStep() {
  const { data, patch } = useOnboardingStore();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-name">Full name</Label>
        <Input
          id="ob-name"
          value={data.fullName}
          onChange={(e) => patch({ fullName: e.target.value })}
          placeholder="Ada Lovelace"
          data-testid="onboarding-fullname"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-title">Job title</Label>
        <Input
          id="ob-title"
          value={data.jobTitle}
          onChange={(e) => patch({ jobTitle: e.target.value })}
          placeholder="Engineering Lead"
          data-testid="onboarding-jobtitle"
        />
      </div>
    </div>
  );
}

function WorkspaceStep() {
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
          data-testid="onboarding-org-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ob-slug">Workspace URL (optional)</Label>
        <Input
          id="ob-slug"
          value={data.organizationSlug}
          onChange={(e) => patch({ organizationSlug: e.target.value })}
          placeholder="acme"
          data-testid="onboarding-org-slug"
        />
      </div>
    </div>
  );
}

function InviteStep() {
  const { data, patch } = useOnboardingStore();
  const [email, setEmail] = useState('');

  const add = () => {
    const trimmed = email.trim();
    if (trimmed && !data.invites.includes(trimmed)) {
      patch({ invites: [...data.invites, trimmed] });
    }
    setEmail('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ob-invite">Teammate email</Label>
          <Input
            id="ob-invite"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="teammate@company.com"
            data-testid="onboarding-invite-email"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={add}
          data-testid="onboarding-invite-add"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
      {data.invites.length > 0 && (
        <ul className="space-y-2" data-testid="onboarding-invite-list">
          {data.invites.map((invite) => (
            <li
              key={invite}
              className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2 text-sm"
            >
              {invite}
              <button
                type="button"
                aria-label={`Remove ${invite}`}
                onClick={() =>
                  patch({ invites: data.invites.filter((i) => i !== invite) })
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
        <Rocket className="text-primary h-7 w-7" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">
        We&apos;ll help you set up your profile, create your first organization, and
        invite your team. It only takes a minute.
      </p>
    </div>
  );
}

function DoneStep() {
  const { data } = useOnboardingStore();
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Name</dt>
        <dd className="font-medium">{data.fullName || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Organization</dt>
        <dd className="font-medium">{data.organizationName || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Invites</dt>
        <dd className="font-medium">{data.invites.length} pending</dd>
      </div>
    </dl>
  );
}

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
 * invitations, resolves permissions, and lands the user on the dashboard.
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
      const tenant = useTenantStore.getState();
      tenant.setTenant(org.id, org.slug);
      persistTenantToStorage(org.id, org.slug);
      tenant.setPermissions(await getMyPermissions());

      await Promise.all(
        data.invites.map((email) => createInvitation({ email, role: 'member' })),
      );

      complete();
      toast.success('Welcome! Your workspace is ready.');
      navigate({ to: '/', replace: true });
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
