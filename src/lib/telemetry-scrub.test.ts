import { describe, expect, it } from 'vitest';

import {
  hasSensitiveParams,
  scrubEventUrls,
  scrubObjectUrls,
  scrubSensitiveUrl,
} from './telemetry-scrub.ts';

describe('scrubSensitiveUrl', () => {
  it('filters ?token= values and keeps the rest of the URL', () => {
    expect(
      scrubSensitiveUrl('https://app.example.com/reset-password?token=sec-123'),
    ).toBe('https://app.example.com/reset-password?token=[Filtered]');
  });

  it('filters &token= mid-query and is case-insensitive', () => {
    expect(scrubSensitiveUrl('/verify-email?a=1&Token=abc&b=2')).toBe(
      '/verify-email?a=1&Token=[Filtered]&b=2',
    );
  });

  it('does NOT touch differently-named params like access_token', () => {
    const url = '/cb?access_token=keepme';
    expect(scrubSensitiveUrl(url)).toBe(url);
  });

  it('leaves URLs without sensitive params unchanged', () => {
    const url = '/organization/org_1/dashboard?tab=overview';
    expect(scrubSensitiveUrl(url)).toBe(url);
  });
});

describe('hasSensitiveParams', () => {
  it('detects token=', () => {
    expect(hasSensitiveParams('/x?token=1')).toBe(true);
    expect(hasSensitiveParams('/x?safe=1')).toBe(false);
  });
});

describe('scrubObjectUrls', () => {
  it('scrubs flat and nested string values (PostHog $set_once shape)', () => {
    const props: Record<string, unknown> = {
      $current_url: 'https://x.dev/reset-password?token=abc',
      $set_once: { $initial_current_url: 'https://x.dev/verify-email?token=xyz' },
      count: 3,
      tags: ['?token=in-array-untouched'],
    };

    scrubObjectUrls(props);

    expect(props.$current_url).toBe('https://x.dev/reset-password?token=[Filtered]');
    expect((props.$set_once as Record<string, unknown>).$initial_current_url).toBe(
      'https://x.dev/verify-email?token=[Filtered]',
    );
    expect(props.count).toBe(3);
  });
});

describe('scrubEventUrls', () => {
  it('scrubs request.url and breadcrumb data on a Sentry-shaped event', () => {
    const event = {
      request: { url: 'https://x.dev/reset-password?token=abc' },
      breadcrumbs: [
        {
          data: {
            from: '/login',
            to: '/reset-password?token=abc',
          },
        },
        { data: undefined },
      ],
    };

    const out = scrubEventUrls(event);

    expect(out).toBe(event); // in place, same reference back to Sentry
    expect(out.request.url).toBe('https://x.dev/reset-password?token=[Filtered]');
    expect(out.breadcrumbs[0]?.data?.to).toBe('/reset-password?token=[Filtered]');
    expect(out.breadcrumbs[0]?.data?.from).toBe('/login');
  });
});
