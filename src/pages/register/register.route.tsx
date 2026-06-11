import { RegisterPage } from './RegisterPage.tsx';

/**
 * Register route — lazy loaded.
 * Exports Component for TanStack Router's lazy() resolution.
 * Shell: the pathless `auth-shell` route in routeTree mounts AuthLayout.
 */
export function Component() {
  return <RegisterPage />;
}
