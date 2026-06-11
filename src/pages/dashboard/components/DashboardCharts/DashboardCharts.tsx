import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import type { ChartConfig } from '@/shared/components/ui/chart.tsx';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart.tsx';

import type { MonthlyChartPoint, WeeklyChartPoint } from '../../dashboard.contracts.ts';
import {
  useMonthlyChartData,
  useWeeklyChartData,
} from '../../hooks/useDashboard/index.ts';

const chartConfig = {
  users: { label: 'Users', color: 'var(--color-primary)' },
  revenue: { label: 'Revenue', color: 'var(--color-chart-2)' },
  signups: { label: 'Signups', color: 'var(--color-primary)' },
} satisfies ChartConfig;

const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Dashboard analytics charts, rendered with the shadcn chart component (Recharts)
 * over randomized mock data from the dashboard API.
 *
 * @param props.activeChart - Which series to render: `growth`, `revenue`, or `signups`.
 */
function GrowthChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        width={44}
        tickFormatter={(v: number) => compactNumber.format(v)}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Area
        dataKey="users"
        type="monotone"
        fill="var(--color-users)"
        fillOpacity={0.3}
        stroke="var(--color-users)"
        strokeWidth={2}
      />
    </AreaChart>
  );
}

function RevenueChart({ data }: { data: MonthlyChartPoint[] }) {
  return (
    <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        width={52}
        tickFormatter={(v: number) => `$${compactNumber.format(v)}`}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Area
        dataKey="revenue"
        type="monotone"
        fill="var(--color-revenue)"
        fillOpacity={0.3}
        stroke="var(--color-revenue)"
        strokeWidth={2}
      />
    </AreaChart>
  );
}

function SignupsChart({ data }: { data: WeeklyChartPoint[] }) {
  return (
    <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
    </BarChart>
  );
}

function renderChart(
  activeChart: string,
  monthly: MonthlyChartPoint[],
  weekly: WeeklyChartPoint[],
) {
  if (activeChart === 'revenue') return <RevenueChart data={monthly} />;
  if (activeChart === 'signups') return <SignupsChart data={weekly} />;
  return <GrowthChart data={monthly} />;
}

export function DashboardCharts({ activeChart }: { activeChart: string }) {
  const monthly = useMonthlyChartData();
  const weekly = useWeeklyChartData();

  const needsWeekly = activeChart === 'signups';
  const isLoading = needsWeekly
    ? weekly.isPending || !weekly.data
    : monthly.isPending || !monthly.data;

  if (isLoading) {
    return (
      <div
        className="text-muted-foreground flex h-[300px] items-center justify-center"
        role="status"
        aria-live="polite"
        data-testid="dashboard-charts-loading"
      >
        Loading chart…
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[300px] w-full"
      data-testid="dashboard-charts"
    >
      {renderChart(activeChart, monthly.data ?? [], weekly.data ?? [])}
    </ChartContainer>
  );
}
