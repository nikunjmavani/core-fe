import type { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section wrapper. Scroll-in entrance animations were intentionally removed for
 * a calmer, static UI — this now renders a plain `<div>` so layout/spacing at
 * call sites is preserved.
 */
export function AnimatedSection({ children, className }: AnimatedSectionProps) {
  return <div className={className}>{children}</div>;
}
