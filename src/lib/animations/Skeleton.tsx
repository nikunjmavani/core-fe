import { cn } from '@/lib/utils.ts';

/**
 * Basic pulse skeleton — loading placeholder.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLOutputElement>) {
  return (
    <output
      className={cn('bg-muted block animate-pulse rounded-md', className)}
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}

/**
 * Polished shimmer skeleton — uses the shimmer keyframe from index.css.
 * More visually appealing than the basic pulse.
 */
export function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLOutputElement>) {
  return (
    <output
      className={cn('animate-shimmer skeleton-shimmer-bg block rounded-md', className)}
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}
