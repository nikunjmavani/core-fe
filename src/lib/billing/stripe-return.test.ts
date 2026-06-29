import { describe, expect, it } from 'vitest';

import {
  omitStripeReturnParams,
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

  it('strips every Stripe return param from a router search object', () => {
    const next = omitStripeReturnParams({
      tab: 'billing',
      payment_intent: 'pi_1',
      payment_intent_client_secret: 'pi_secret',
      setup_intent: 'si_1',
      setup_intent_client_secret: 'si_secret',
      redirect_status: 'succeeded',
    });

    expect(next).toEqual({ tab: 'billing' });
  });

  it('does not mutate the input search object', () => {
    const input = { redirect_status: 'succeeded', q: 'x' };
    const next = omitStripeReturnParams(input);
    expect(input).toEqual({ redirect_status: 'succeeded', q: 'x' });
    expect(next).not.toBe(input);
    expect(next).toEqual({ q: 'x' });
  });
});
