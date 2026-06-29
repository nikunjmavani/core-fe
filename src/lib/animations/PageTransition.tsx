import { useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps the route `<Outlet />` and plays a single, subtle fade + rise whenever
 * the path changes. Uses transform-only `route-rise` (no opacity fade) so copy
 * stays visible if animation is skipped or reduced-motion overrides duration.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="text-foreground animate-fade-in-up">
      {children}
    </div>
  );
}
