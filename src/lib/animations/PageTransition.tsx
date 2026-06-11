import { useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps the route `<Outlet />` and plays a single, subtle fade + rise whenever
 * the path changes. Keyed by pathname so the CSS animation re-triggers on
 * navigation. Honours `prefers-reduced-motion` via the global guard in
 * `index.css`.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
