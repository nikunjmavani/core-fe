import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { initDeferredIconSets, loadIconSet } from './icon-registry.ts';

describe('initDeferredIconSets', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    useThemeStore.setState({ iconLibrary: 'lucide' } as never);
  });

  it('registers without loading lucide on boot', () => {
    expect(() => initDeferredIconSets()).not.toThrow();
  });
});

describe('loadIconSet', () => {
  it('no-ops for lucide', () => {
    expect(() => loadIconSet('lucide')).not.toThrow();
  });
});
