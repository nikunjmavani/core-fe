/* eslint-disable sonarjs/pseudo-random -- mock/demo data generators only; not security-sensitive */
import type {
  ActivityItem,
  ActivityType,
  DashboardStat,
  Goal,
  HeatCell,
  MonthlyChartPoint,
  StatTrend,
  WeeklyChartPoint,
} from './dashboard.contracts.ts';

/**
 * Randomized mock-data generators for the dashboard.
 *
 * Called by the mock dashboard API (`./api.ts`) so each fetch produces fresh,
 * plausible numbers — the dashboard looks "alive" instead of static. Replaced by
 * live backend data once the endpoints are wired (search `REPLACE_WITH_API`).
 */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function changeFromPct(pct: number): { change: string; trend: StatTrend } {
  const trend: StatTrend = pct >= 0 ? 'up' : 'down';
  const change = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  return { change, trend };
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A short trend series (for the inline sparkline) that drifts in the direction
 * of `trend`, ending near the current value.
 */
function sparkSeries(end: number, trend: StatTrend, points = 12): number[] {
  const series: number[] = [];
  // Start lower (uptrend) or higher (downtrend) and walk toward `end`.
  let value = trend === 'up' ? end * 0.72 : end * 1.28;
  const step = (end - value) / (points - 1);
  for (let i = 0; i < points; i += 1) {
    const jitter = end * (randInt(-4, 4) / 100);
    series.push(Math.max(0, Math.round(value + jitter)));
    value += step;
  }
  series[points - 1] = Math.round(end);
  return series;
}

/** Four headline stat cards with randomized values, deltas, and sparklines. */
export function generateStats(): DashboardStat[] {
  const totalUsers = randInt(1800, 4200);
  const orgs = randInt(80, 320);
  const revenue = randInt(28000, 92000);
  const sessions = randInt(300, 900);

  const usersDelta = changeFromPct(randInt(20, 280) / 10);
  const orgsDelta = changeFromPct(randInt(5, 140) / 10);
  const revenueDelta = changeFromPct(randInt(-60, 320) / 10);
  const sessionsDelta = changeFromPct(randInt(-90, 120) / 10);

  return [
    {
      id: 'users',
      title: 'Total Users',
      value: totalUsers.toLocaleString(),
      valueRaw: totalUsers,
      prefix: '',
      description: 'vs last month',
      spark: sparkSeries(totalUsers, usersDelta.trend),
      ...usersDelta,
    },
    {
      id: 'orgs',
      title: 'Organizations',
      value: orgs.toLocaleString(),
      valueRaw: orgs,
      prefix: '',
      description: 'vs last month',
      spark: sparkSeries(orgs, orgsDelta.trend),
      ...orgsDelta,
    },
    {
      id: 'revenue',
      title: 'Monthly Revenue',
      value: `$${revenue.toLocaleString()}`,
      valueRaw: revenue,
      prefix: '$',
      description: 'vs last month',
      spark: sparkSeries(revenue, revenueDelta.trend),
      ...revenueDelta,
    },
    {
      id: 'active',
      title: 'Active Sessions',
      value: sessions.toLocaleString(),
      valueRaw: sessions,
      prefix: '',
      description: 'vs last hour',
      spark: sparkSeries(sessions, sessionsDelta.trend),
      ...sessionsDelta,
    },
  ];
}

/** Three KPI targets shown as a radial gauge + progress bars. */
export function generateGoals(): Goal[] {
  return [
    {
      id: 'revenue',
      label: 'Revenue target',
      current: randInt(48000, 92000),
      target: 100000,
      unit: 'currency',
    },
    {
      id: 'signups',
      label: 'New signups',
      current: randInt(420, 980),
      target: 1000,
      unit: 'count',
    },
    {
      id: 'retention',
      label: 'Retention rate',
      current: randInt(82, 97),
      target: 95,
      unit: 'percent',
    },
  ];
}

/**
 * A contribution-style activity heatmap: `weeks` × 7 days ending today, with
 * higher counts on weekdays and a few quiet days for realism.
 */
export function generateHeatmap(weeks = 18): HeatCell[] {
  const totalDays = weeks * 7;
  const today = new Date();
  const cells: HeatCell[] = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const quiet = randInt(0, 9) === 0;
    const base = isWeekend ? randInt(0, 6) : randInt(2, 18);
    cells.push({
      date: d.toISOString().slice(0, 10),
      count: quiet ? 0 : base,
    });
  }
  return cells;
}

const ACTORS = [
  'Sarah Chen',
  'James Wilson',
  'Priya Patel',
  'Marcus Johnson',
  'Emily Rodriguez',
  'Liam O\u2019Brien',
  'Yuki Tanaka',
  'Noah Smith',
];

const ACTIONS: { action: string; type: ActivityType; targets: string[] }[] = [
  {
    action: 'created organization',
    type: 'create',
    targets: ['Acme Corp', 'Globex', 'Initech'],
  },
  { action: 'upgraded plan to', type: 'upgrade', targets: ['Enterprise', 'Pro'] },
  {
    action: 'invited members to',
    type: 'invite',
    targets: ['DevTeam', 'Design', 'Sales'],
  },
  {
    action: 'deleted user',
    type: 'delete',
    targets: ['inactive@test.com', 'bot@spam.io'],
  },
  { action: 'exported audit logs for', type: 'export', targets: ['Q4 2025', 'May 2026'] },
];

const TIMES = [
  '2 minutes ago',
  '15 minutes ago',
  '1 hour ago',
  '2 hours ago',
  '3 hours ago',
  'Yesterday',
  '2 days ago',
];

/** A single randomized activity event. `time` defaults to "Just now" for live feeds. */
export function generateActivityItem(time = 'Just now'): ActivityItem {
  const template = pick(ACTIONS);
  return {
    id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    user: pick(ACTORS),
    action: template.action,
    target: pick(template.targets),
    time,
    type: template.type,
  };
}

/** A randomized recent-activity feed (newest first). */
export function generateActivity(): ActivityItem[] {
  const count = 5;
  return Array.from({ length: count }, (_, index) =>
    generateActivityItem(TIMES[index % TIMES.length] ?? 'Just now'),
  );
}

/** 12 months of users + revenue as a gently increasing random walk. */
export function generateMonthlyChart(): MonthlyChartPoint[] {
  let users = randInt(300, 500);
  let revenue = randInt(2000, 3000);
  return MONTHS.map((name) => {
    users += randInt(60, 260);
    revenue += randInt(200, 900);
    return { name, users, revenue };
  });
}

/** Seven days of randomized signups. */
export function generateWeeklyChart(): WeeklyChartPoint[] {
  return WEEKDAYS.map((day) => ({ day, signups: randInt(6, 50) }));
}
