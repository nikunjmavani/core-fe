import { cn } from '@/lib/utils.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

import type { HeatCell } from '../../dashboard.contracts.ts';

/** Background per intensity level (0 = empty → 4 = busiest). */
const LEVEL_BG = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
];

function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function HeatmapGrid({ data }: { data: HeatCell[] }) {
  const max = Math.max(1, ...data.map((c) => c.count));
  const total = data.reduce((sum, c) => sum + c.count, 0);
  const weeks = Math.ceil(data.length / 7);
  // Pad the front so the first cell lands on its weekday row (Sun..Sat).
  const firstDay = data[0] ? new Date(data[0].date).getUTCDay() : 0;

  return (
    <div className="space-y-3">
      <div
        className="overflow-x-auto"
        role="img"
        aria-label={`Activity heatmap: ${total.toLocaleString()} events over the last ${weeks} weeks`}
        data-testid="activity-heatmap-grid"
      >
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`pad-${i}`} className="h-3 w-3" aria-hidden="true" />
          ))}
          {data.map((cell) => (
            <div
              key={cell.date}
              className={cn('h-3 w-3 rounded-[2px]', LEVEL_BG[levelFor(cell.count, max)])}
              title={`${cell.count} event${cell.count === 1 ? '' : 's'} on ${formatDate(cell.date)}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{total.toLocaleString()} events tracked</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {LEVEL_BG.map((bg, i) => (
            <span
              key={i}
              className={cn('h-3 w-3 rounded-[2px]', bg)}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

/**
 * GitHub-style contribution heatmap of platform activity over the last weeks,
 * driven by mock data. Columns are weeks; rows are weekdays.
 */
export function ActivityHeatmap({
  data,
  isLoading,
}: {
  data?: HeatCell[];
  isLoading: boolean;
}) {
  return (
    <Card className="h-full" data-testid="activity-heatmap">
      <CardHeader>
        <CardTitle className="text-base">Platform Activity</CardTitle>
        <CardDescription>Events per day across the last 18 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-[120px] w-full" data-testid="activity-heatmap-loading" />
        ) : (
          <HeatmapGrid data={data} />
        )}
      </CardContent>
    </Card>
  );
}
