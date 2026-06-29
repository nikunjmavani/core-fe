import { describe, expect, it } from 'vitest';

import { isMultiLocaleBuild } from '@/lib/i18n/build-runtime.ts';
import i18n from '@/lib/i18n/i18n.ts';
import { ensureNamespace } from '@/lib/i18n/load-namespace.ts';
import { I18N_NAMESPACES } from '@/lib/i18n/namespaces.ts';

describe('load-namespace', () => {
  it('runs the multi-locale loader under vitest', () => {
    expect(isMultiLocaleBuild()).toBe(true);
  });

  it('lazy-loads the auth namespace for Spanish', async () => {
    await ensureNamespace('es', I18N_NAMESPACES.auth);
    expect(i18n.hasResourceBundle('es', I18N_NAMESPACES.auth)).toBe(true);
    expect(i18n.t('mfa.heading', { ns: I18N_NAMESPACES.auth, lng: 'es' })).toBe(
      'Autenticación en dos pasos',
    );
  });

  it('lazy-loads Chinese onboarding copy', async () => {
    await ensureNamespace('zh', I18N_NAMESPACES.onboarding);
    expect(
      i18n.t('steps.welcome.title', { ns: I18N_NAMESPACES.onboarding, lng: 'zh' }),
    ).toBe('欢迎加入');
  });
});
