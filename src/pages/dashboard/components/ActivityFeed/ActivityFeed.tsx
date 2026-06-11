import { cn } from '@/lib/utils.ts';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

import type { ActivityItem, ActivityType } from '../../dashboard.contracts.ts';
import { useLiveActivity } from '../../hooks/useDashboard/index.ts';

const BADGE: Record<
  ActivityType,
  {
    label: string;
    variant: 'success' | 'default' | 'secondary' | 'destructive' | 'warning';
  }
> = {
  create: { label: 'Created', variant: 'success' },
  upgrade: { label: 'Upgraded', variant: 'default' },
  invite: { label: 'Invited', variant: 'secondary' },
  delete: { label: 'Deleted', variant: 'destructive' },
  export: { label: 'Exported', variant: 'warning' },
};

function ActivityBadge({ type }: { type: ActivityType }) {
  // eslint-disable-next-line security/detect-object-injection -- type is a bounded ActivityType union
  const { label, variant } = BADGE[type];
  return <Badge variant={variant}>{label}</Badge>;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('');
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" data-testid="activity-feed-loading">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Recent-activity feed that streams new mock events over time (newest first).
 * The latest event animates in. Streaming/polling lives in {@link useLiveActivity}.
 */
export function ActivityFeed({
  seed,
  isLoading,
}: {
  seed?: ActivityItem[];
  isLoading: boolean;
}) {
  const items = useLiveActivity(seed);

  if (isLoading || !seed) return <FeedSkeleton />;

  return (
    <div className="space-y-4" data-testid="activity-feed" aria-live="polite">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            index === 0 && 'animate-in fade-in slide-in-from-top-1 duration-300',
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar className="mt-0.5 h-8 w-8">
              <AvatarFallback className="text-xs">{initials(item.user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{item.user}</span>{' '}
                <span className="text-muted-foreground">{item.action}</span>{' '}
                <span className="font-medium">{item.target}</span>
              </p>
              <p className="text-muted-foreground text-xs">{item.time}</p>
            </div>
            <ActivityBadge type={item.type} />
          </div>
          {index < items.length - 1 && <Separator className="mt-4" />}
        </div>
      ))}
    </div>
  );
}
