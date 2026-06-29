import { describe, expect, it } from 'vitest';

import { billingQueryKeys } from './billing-query-keys.ts';

describe('billingQueryKeys', () => {
  it('scopes plans and subscriptions under billing', () => {
    expect(billingQueryKeys.plans()).toEqual(['billing', 'plans']);
    expect(billingQueryKeys.activeSubscription()).toEqual([
      'billing',
      'active-subscription',
    ]);
  });
});
