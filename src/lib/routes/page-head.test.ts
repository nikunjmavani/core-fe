import { describe, expect, it } from 'vitest';

import { APP_TITLE, composePageTitle, manifestHead } from './page-head.ts';

describe('page-head', () => {
  it('composes "<page> · Core Admin"', () => {
    expect(composePageTitle('Sign in')).toBe(`Sign in · ${APP_TITLE}`);
  });

  it('manifestHead turns a manifest title into a head meta title', () => {
    const head = manifestHead({ title: 'Dashboard' });
    expect(head()).toEqual({ meta: [{ title: 'Dashboard · Core Admin' }] });
  });
});
