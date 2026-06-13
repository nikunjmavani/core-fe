import { Button } from '@/shared/components/ui/button.tsx';
import { useConsentStore } from '@/shared/store/useConsentStore/index.ts';

/** Optional link to the deployment's privacy policy (omitted when unset). */
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL as string | undefined;

/**
 * Analytics cookie-consent banner. Shown only while the decision is undecided;
 * Accept/Decline persist to {@link useConsentStore}. PostHog (the only
 * cookie-setting analytics) does not initialize until consent is granted — the
 * boot sequence in `main.tsx` reacts to the store. Error monitoring (Sentry)
 * runs under legitimate interest and is not gated here.
 */
export function ConsentBanner() {
  const decision = useConsentStore((s) => s.analyticsConsent);
  const setConsent = useConsentStore((s) => s.setAnalyticsConsent);

  if (decision !== null) return null;

  return (
    <section
      aria-label="Cookie consent"
      data-testid="consent-banner"
      className="bg-card text-card-foreground fixed inset-x-0 bottom-0 z-50 border-t shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          We use cookies for product analytics to improve Core. Essential functionality
          and error monitoring work without them.
          {PRIVACY_URL ? (
            <>
              {' '}
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-foreground font-medium underline"
              >
                Privacy Policy
              </a>
            </>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConsent('denied')}
            data-testid="consent-decline"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => setConsent('granted')}
            data-testid="consent-accept"
          >
            Accept
          </Button>
        </div>
      </div>
    </section>
  );
}
