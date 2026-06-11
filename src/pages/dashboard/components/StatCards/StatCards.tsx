import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  Users,
} from 'lucide-react';

import { useCountUp } from '@/lib/animations/index.ts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

import type { DashboardStat } from '../../dashboard.contracts.ts';
import { Sparkline } from '../Sparkline/index.ts';

/** Map a stat id to its icon (avoids dynamic object indexing). */
function StatIcon({ id }: { id: string }) {
  if (id === 'orgs') return <Building2 className="text-primary h-4 w-4" />;
  if (id === 'revenue') return <CreditCard className="text-primary h-4 w-4" />;
  if (id === 'active') return <Activity className="text-primary h-4 w-4" />;
  return <Users className="text-primary h-4 w-4" />;
}

/** Animated, formatted stat value that counts up on mount. */
function StatValue({ stat }: { stat: DashboardStat }) {
  const animated = useCountUp(stat.valueRaw);
  const display = `${stat.prefix}${Math.round(animated).toLocaleString()}`;

  return (
    <div
      className="text-2xl font-bold tabular-nums"
      data-testid={`stat-value-${stat.id}`}
    >
      {display}
    </div>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  const isUp = stat.trend === 'up';

  return (
    <Card
      data-testid={`stat-card-${stat.id}`}
      className="overflow-hidden transition-shadow duration-200 hover:shadow-md"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {stat.title}
        </CardTitle>
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
          <StatIcon id={stat.id} />
        </div>
      </CardHeader>
      <CardContent>
        <StatValue stat={stat} />
        <div className="mt-1 flex items-center text-xs">
          {isUp ? (
            <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
          ) : (
            <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
          )}
          <span className={isUp ? 'text-emerald-500' : 'text-red-500'}>
            {stat.change}
          </span>
          <span className="text-muted-foreground ml-1">{stat.description}</span>
        </div>
        <Sparkline
          id={stat.id}
          data={stat.spark}
          trend={stat.trend}
          className="mt-3 h-10 w-full"
        />
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Headline KPI cards with an animated count-up value and an inline trend
 * sparkline. Driven by mock dashboard data.
 */
export function StatCards({
  stats,
  isLoading,
}: {
  stats?: DashboardStat[];
  isLoading: boolean;
}) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-stat-cards"
    >
      {isLoading || !stats
        ? [0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)
        : stats.map((stat) => <StatCard key={stat.id} stat={stat} />)}
    </div>
  );
}
