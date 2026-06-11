import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import type { StatTrend } from '../../dashboard.contracts.ts';

interface SparklineProps {
  /** Unique id (used for the gradient + test id). */
  id: string;
  data: number[];
  trend: StatTrend;
  className?: string;
}

/** Trend stroke colors — mirror the up/down arrow colors used on the stat cards. */
const TREND_COLOR: Record<StatTrend, string> = {
  up: '#10b981',
  down: '#ef4444',
};

/**
 * Tiny inline trend chart (no axes/grid) for the headline stat cards.
 *
 * Decorative — the numeric value and delta convey the data — so it is hidden
 * from assistive tech.
 */
export function Sparkline({ id, data, trend, className }: SparklineProps) {
  const color = trend === 'up' ? TREND_COLOR.up : TREND_COLOR.down;
  const gradientId = `spark-gradient-${id}`;
  const points = data.map((value, index) => ({ index, value }));

  return (
    <div className={className} data-testid={`sparkline-${id}`} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
