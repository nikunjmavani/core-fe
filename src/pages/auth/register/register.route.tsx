import { AuthLayout } from '@/shared/layouts/AuthLayout/index.ts';

import { RegisterPage } from './RegisterPage.tsx';

/**
 * Register route — lazy loaded.
 * Exports Component for TanStack Router's lazy() resolution.
 */
export function Component() {
  return (
    <AuthLayout>
      <RegisterPage />
    </AuthLayout>
  );
}
