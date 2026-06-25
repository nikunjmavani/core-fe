import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useConsentStore } from '@/shared/store/useConsentStore/index.ts';

import { ConsentBanner } from './ConsentBanner.tsx';

vi.mock('@/core/config/env.ts', () => ({
  config: { privacyPolicyUrl: undefined },
}));

const captureAnalyticsConsentDecision = vi.fn(async () => undefined);
vi.mock('@/shared/analytics/capture-consent-decision.ts', () => ({
  captureAnalyticsConsentDecision: (...args: unknown[]) =>
    captureAnalyticsConsentDecision(...args),
}));

describe('ConsentBanner', () => {
  beforeEach(() => {
    useConsentStore.getState().resetAnalyticsConsent();
    captureAnalyticsConsentDecision.mockClear();
  });

  it('shows while the decision is undecided', () => {
    render(<ConsentBanner />);
    // <section aria-label> exposes an implicit region role with that name.
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toBeInTheDocument();
  });

  it('Accept grants consent and hides the banner', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ConsentBanner />);

    await user.click(screen.getByTestId('consent-accept'));

    expect(useConsentStore.getState().analyticsConsent).toBe('granted');
    await waitFor(() => {
      expect(captureAnalyticsConsentDecision).toHaveBeenCalledWith('granted');
    });
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-banner')).not.toBeInTheDocument();
  });

  it('Decline denies consent and hides the banner', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ConsentBanner />);

    await user.click(screen.getByTestId('consent-decline'));

    expect(useConsentStore.getState().analyticsConsent).toBe('denied');
    await waitFor(() => {
      expect(captureAnalyticsConsentDecision).toHaveBeenCalledWith('denied');
    });
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-banner')).not.toBeInTheDocument();
  });

  it('renders nothing once a decision exists', () => {
    useConsentStore.getState().setAnalyticsConsent('denied');
    const { container } = render(<ConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
