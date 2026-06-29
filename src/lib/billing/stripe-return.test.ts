import { describe, expect, it, vi } from 'vitest';

import {
  clearStripeBillingReturnParams,
  readStripeBillingReturnParams,
} from './stripe-return.ts';

describe('stripe-return', () => {
  it('reads Stripe return params from a search string', () => {
    const params = readStripeBillingReturnParams(
      '?payment_intent_client_secret=pi_secret&redirect_status=succeeded',
    );
    expect(params.paymentIntentClientSecret).toBe('pi_secret');
    expect(params.redirectStatus).toBe('succeeded');
    expect(params.setupIntentClientSecret).toBeNull();
  });

  it('clears Stripe return params from the URL', () => {
    const replaceState = vi.fn();
    const original = window.history.replaceState;
    window.history.replaceState = replaceState;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL(
        'http://localhost:5173/organization/acme/dashboard?payment_intent_client_secret=pi_secret&redirect_status=succeeded#settings/account/billing',
      ),
    });

    clearStripeBillingReturnParams();

    expect(replaceState).toHaveBeenCalled();
    const nextUrl = String(replaceState.mock.calls[0]?.[2]);
    expect(nextUrl).not.toContain('payment_intent_client_secret');
    expect(nextUrl).toContain('#settings/account/billing');

    window.history.replaceState = original;
  });
});
