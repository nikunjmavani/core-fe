import { cn } from '@/lib/utils.ts';

/**
 * Basic pulse skeleton — loading placeholder.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-muted animate-pulse rounded-md', className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Polished shimmer skeleton — uses the shimmer keyframe from index.css.
 * More visually appealing than the basic pulse.
 */
export function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-shimmer skeleton-shimmer-bg rounded-md', className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
