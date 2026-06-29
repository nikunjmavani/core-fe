import { describe, expect, it } from 'vitest';

import { i18n } from '@/lib/i18n/index.ts';
import { ensureNamespace } from '@/lib/i18n/load-namespace.ts';
import { I18N_NAMESPACES } from '@/lib/i18n/namespaces.ts';

describe('i18n bootstrap', () => {
  it('loads the onboarding namespace with English strings', async () => {
    await ensureNamespace('en', I18N_NAMESPACES.onboarding);
    expect(i18n.t('steps.welcome.title', { ns: I18N_NAMESPACES.onboarding })).toBe(
      'Welcome aboard',
    );
  });

  it('loads Spanish auth strings when language is es', async () => {
    await ensureNamespace('es', I18N_NAMESPACES.auth);
    await i18n.changeLanguage('es');
    expect(i18n.t('mfa.heading', { ns: I18N_NAMESPACES.auth })).toBe(
      'Autenticación en dos pasos',
    );
    await i18n.changeLanguage('en');
  });
});
