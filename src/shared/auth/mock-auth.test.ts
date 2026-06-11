import { afterEach, describe, expect, it } from 'vitest';

import {
  endMockSession,
  hasMockSession,
  MOCK_USER,
  startMockSession,
} from './mock-auth.ts';

describe('mock-auth session', () => {
  afterEach(() => endMockSession());

  it('starts with no session', () => {
    endMockSession();
    expect(hasMockSession()).toBe(false);
  });

  it('starts and ends a session', () => {
    startMockSession();
    expect(hasMockSession()).toBe(true);
    endMockSession();
    expect(hasMockSession()).toBe(false);
  });

  it('exposes a mock user with a global role', () => {
    expect(MOCK_USER.role).toBe('user');
    expect(MOCK_USER.email).toContain('@');
  });
});
