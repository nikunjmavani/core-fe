import { describe, expect, it } from 'vitest';

import {
  isMockLoginValid,
  MOCK_LOGIN_EMAIL,
  MOCK_LOGIN_PASSWORD,
} from './mock-credentials.ts';

describe('isMockLoginValid', () => {
  it('accepts demo credentials (case-insensitive email)', () => {
    expect(
      isMockLoginValid({
        email: MOCK_LOGIN_EMAIL.toUpperCase(),
        password: MOCK_LOGIN_PASSWORD,
      }),
    ).toBe(true);
  });

  it('rejects wrong password', () => {
    expect(isMockLoginValid({ email: MOCK_LOGIN_EMAIL, password: 'wrongpassword' })).toBe(
      false,
    );
  });

  it('rejects unknown email', () => {
    expect(
      isMockLoginValid({ email: 'wrong@example.com', password: MOCK_LOGIN_PASSWORD }),
    ).toBe(false);
  });
});
