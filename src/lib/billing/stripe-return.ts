const STRIPE_RETURN_PARAMS = [
  'payment_intent',
  'payment_intent_client_secret',
  'setup_intent',
  'setup_intent_client_secret',
  'redirect_status',
] as const;

export interface StripeBillingReturnParams {
  paymentIntentClientSecret: string | null;
  setupIntentClientSecret: string | null;
  redirectStatus: string | null;
}

/** Reads Stripe return query params after a redirect (3DS / SCA). */
export function readStripeBillingReturnParams(
  search = typeof window !== 'undefined' ? window.location.search : '',
): StripeBillingReturnParams {
  const params = new URLSearchParams(search);
  return {
    paymentIntentClientSecret: params.get('payment_intent_client_secret'),
    setupIntentClientSecret: params.get('setup_intent_client_secret'),
    redirectStatus: params.get('redirect_status'),
  };
}

/** Removes Stripe return params from the URL without a full navigation. */
export function clearStripeBillingReturnParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of STRIPE_RETURN_PARAMS) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, '', url.toString());
}

export function stripeBillingReturnUrl(): string {
  if (typeof window === 'undefined') return '#settings/account/billing';
  return `${window.location.origin}${window.location.pathname}${window.location.search}#settings/account/billing`;
}
