import { beforeEach, describe, expect, it, vi } from 'vitest';

const disabledRef = vi.hoisted(() => ({ value: new Set<string>() }));
vi.mock('@/core/config/env.ts', () => ({
  config: {
    get disabledModules() {
      return disabledRef.value;
    },
  },
}));

import { isModuleEnabled, requireModuleGate } from './require-module.ts';

beforeEach(() => {
  disabledRef.value = new Set<string>();
});

describe('requireModuleGate (L6b)', () => {
  it('passes when the module is enabled (not in the disabled set)', () => {
    expect(() => requireModuleGate('billing')()).not.toThrow();
    expect(isModuleEnabled('billing')).toBe(true);
  });

  it('throws notFound when the module is disabled', () => {
    disabledRef.value = new Set(['billing']);
    expect(() => requireModuleGate('billing')()).toThrow();
    expect(isModuleEnabled('billing')).toBe(false);
    // a different module stays enabled
    expect(isModuleEnabled('members')).toBe(true);
  });
});
