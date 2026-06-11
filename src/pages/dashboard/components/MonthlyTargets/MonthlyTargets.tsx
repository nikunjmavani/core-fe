import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Progress } from '@/shared/components/ui/progress.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';

import type { Goal } from '../../dashboard.contracts.ts';

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function pct(goal: Goal): number {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

function formatValue(value: number, unit: Goal['unit']): string {
  if (unit === 'currency') return `$${compact.format(value)}`;
  if (unit === 'percent') return `${value}%`;
  return compact.format(value);
}

function RadialGauge({ goal }: { goal: Goal }) {
  const percent = pct(goal);

  return (
    <div className="relative mx-auto h-44 w-44" data-testid="targets-gauge">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ value: percent }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            dataKey="value"
            angleAxisId={0}
            background={{ fill: 'var(--color-muted)' }}
            cornerRadius={10}
            fill="var(--color-primary)"
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold tabular-nums"
          data-testid="targets-gauge-percent"
        >
          {percent}%
        </span>
        <span className="text-muted-foreground text-xs">{goal.label}</span>
      </div>
    </div>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const percent = pct(goal);

  return (
    <div className="space-y-1.5" data-testid={`target-row-${goal.id}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{goal.label}</span>
        <span className="font-medium tabular-nums">
          {formatValue(goal.current, goal.unit)}
          <span className="text-muted-foreground">
            {' '}
            / {formatValue(goal.target, goal.unit)}
          </span>
        </span>
      </div>
      <Progress value={percent} aria-label={`${goal.label}: ${percent}%`} />
    </div>
  );
}

/**
 * Monthly KPI targets: a radial gauge for the headline goal plus progress bars
 * for the rest. Driven by mock dashboard goals.
 */
export function MonthlyTargets({
  goals,
  isLoading,
}: {
  goals?: Goal[];
  isLoading: boolean;
}) {
  const [headline, ...rest] = goals ?? [];

  return (
    <Card className="h-full" data-testid="monthly-targets">
      <CardHeader>
        <CardTitle className="text-base">Monthly Targets</CardTitle>
        <CardDescription>Progress toward this month&apos;s goals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading || !headline ? (
          <>
            <Skeleton
              className="mx-auto h-44 w-44 rounded-full"
              data-testid="targets-loading"
            />
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </>
        ) : (
          <>
            <RadialGauge goal={headline} />
            <div className="space-y-4">
              {rest.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
