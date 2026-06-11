import type { ReactNode } from 'react';

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container previously used for staggered entrance animations. Motion was
 * intentionally removed for a static UI; this renders a plain `<div>` so grid
 * and spacing classes at call sites are preserved.
 */
export function StaggerList({ children, className }: StaggerListProps) {
  return <div className={className}>{children}</div>;
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/** Item wrapper within a {@link StaggerList}; renders a plain `<div>`. */
export function StaggerItem({ children, className }: StaggerItemProps) {
  return <div className={className}>{children}</div>;
}
