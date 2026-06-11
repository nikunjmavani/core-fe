import { Rocket } from 'lucide-react';

/** First onboarding step — short pitch for the setup flow. */
export function WelcomeStep() {
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
