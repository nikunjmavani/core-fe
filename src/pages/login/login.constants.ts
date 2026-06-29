import { AUTH_KEYS, AUTH_NS } from '@/shared/auth/auth-shell.constants.ts';

export { AUTH_KEYS, AUTH_NS };

export const LOGIN_TEST_IDS = {
  page: 'login-page',
} as const;

export const LOGIN_MANIFEST = {
  titleKey: AUTH_KEYS.manifest.login,
  testId: LOGIN_TEST_IDS.page,
} as const;
