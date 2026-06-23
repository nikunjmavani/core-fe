import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import type { GateContext } from '../gate.types.ts';
import { requireSession } from './require-session.ts';

const ctx: GateContext = {
  location: { pathname: '/dashboard', search: '', hash: '', href: '/dashboard' },
  params: {},
};

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe('requireSession (L1)', () => {
  it('throws a redirect when unauthenticated', () => {
    expect(() => requireSession(ctx)).toThrow();
  });

  it('passes when authenticated', () => {
    useAuthStore.setState({
      user: { id: 'u', email: 'a@b.test', role: 'user' },
      isAuthenticated: true,
    });
    expect(() => requireSession(ctx)).not.toThrow();
  });
});
