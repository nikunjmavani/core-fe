import { describe, expect, it } from 'vitest';

import { layoutMainClassName, resolveEffectiveLayoutWidth } from './layout-width.ts';

describe('layout-width', () => {
  it('resolveEffectiveLayoutWidth prefers forced deploy value', () => {
    expect(resolveEffectiveLayoutWidth('full', 'reading')).toBe('full');
    expect(resolveEffectiveLayoutWidth('contained', 'full')).toBe('contained');
  });

  it('resolveEffectiveLayoutWidth uses preference when not forced', () => {
    expect(resolveEffectiveLayoutWidth(null, 'reading')).toBe('reading');
    expect(resolveEffectiveLayoutWidth(null, undefined)).toBe('contained');
    expect(resolveEffectiveLayoutWidth(null, 'bogus')).toBe('contained');
  });

  it('layoutMainClassName maps each width id', () => {
    expect(layoutMainClassName('full')).toBe('w-full');
    expect(layoutMainClassName('contained')).toContain('max-w-screen-2xl');
    expect(layoutMainClassName('reading')).toContain('max-w-3xl');
  });
});
