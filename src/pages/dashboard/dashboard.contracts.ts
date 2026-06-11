import { z } from 'zod';

// ── Stat card ──

export const statTrendSchema = z.enum(['up', 'down']);
export type StatTrend = z.infer<typeof statTrendSchema>;

export const dashboardStatSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.string(),
  /** Numeric value used to animate a count-up to the formatted {@link value}. */
  valueRaw: z.number(),
  /** Prefix rendered before the animated number (e.g. `$`). */
  prefix: z.string(),
  change: z.string(),
  trend: statTrendSchema,
  description: z.string(),
  /** Short trend series used to render the inline sparkline. */
  spark: z.array(z.number()).min(2),
});

export type DashboardStat = z.infer<typeof dashboardStatSchema>;

// ── KPI targets (radial gauge + progress) ──

export const goalUnitSchema = z.enum(['count', 'currency', 'percent']);
export type GoalUnit = z.infer<typeof goalUnitSchema>;

export const goalSchema = z.object({
  id: z.string(),
  label: z.string(),
  current: z.number(),
  target: z.number(),
  unit: goalUnitSchema,
});

export type Goal = z.infer<typeof goalSchema>;

// ── Activity heatmap (contribution-style grid) ──

export const heatCellSchema = z.object({
  /** ISO date (YYYY-MM-DD). */
  date: z.string(),
  count: z.number().int().min(0),
});

export type HeatCell = z.infer<typeof heatCellSchema>;

// ── Activity feed ──

export const activityTypeSchema = z.enum([
  'create',
  'upgrade',
  'invite',
  'delete',
  'export',
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityItemSchema = z.object({
  id: z.string(),
  user: z.string(),
  action: z.string(),
  target: z.string(),
  time: z.string(),
  type: activityTypeSchema,
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

// ── Charts ──

export const monthlyChartPointSchema = z.object({
  name: z.string(),
  users: z.number(),
  revenue: z.number(),
});

export type MonthlyChartPoint = z.infer<typeof monthlyChartPointSchema>;

export const weeklyChartPointSchema = z.object({
  day: z.string(),
  signups: z.number(),
});

export type WeeklyChartPoint = z.infer<typeof weeklyChartPointSchema>;
