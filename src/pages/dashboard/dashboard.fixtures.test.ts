import { describe, expect, it } from 'vitest';

import {
  activityItemSchema,
  dashboardStatSchema,
  goalSchema,
  heatCellSchema,
  monthlyChartPointSchema,
  weeklyChartPointSchema,
} from './dashboard.contracts.ts';
import {
  generateActivity,
  generateActivityItem,
  generateGoals,
  generateHeatmap,
  generateMonthlyChart,
  generateStats,
  generateWeeklyChart,
} from './dashboard.fixtures.ts';

describe('dashboard fixtures', () => {
  it('generateStats returns four schema-valid stat cards', () => {
    const stats = generateStats();
    expect(stats).toHaveLength(4);
    expect(stats.map((s) => s.id)).toEqual(['users', 'orgs', 'revenue', 'active']);
    for (const stat of stats) {
      expect(() => dashboardStatSchema.parse(stat)).not.toThrow();
      expect(stat.change.endsWith('%')).toBe(true);
      expect(Number.isNaN(Number.parseFloat(stat.change))).toBe(false);
    }
  });

  it('generateStats includes a sparkline series ending at the raw value', () => {
    for (const stat of generateStats()) {
      expect(stat.spark.length).toBeGreaterThanOrEqual(2);
      expect(stat.spark.at(-1)).toBe(stat.valueRaw);
    }
  });

  it('generateActivity returns schema-valid items', () => {
    const items = generateActivity();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(() => activityItemSchema.parse(item)).not.toThrow();
    }
  });

  it('generateActivityItem returns one schema-valid event defaulting to "Just now"', () => {
    const item = generateActivityItem();
    expect(() => activityItemSchema.parse(item)).not.toThrow();
    expect(item.time).toBe('Just now');
  });

  it('generateGoals returns three schema-valid goals', () => {
    const goals = generateGoals();
    expect(goals).toHaveLength(3);
    for (const goal of goals) {
      expect(() => goalSchema.parse(goal)).not.toThrow();
      expect(goal.current).toBeLessThanOrEqual(goal.target);
    }
  });

  it('generateHeatmap returns weeks*7 schema-valid cells', () => {
    const cells = generateHeatmap(10);
    expect(cells).toHaveLength(70);
    for (const cell of cells) {
      expect(() => heatCellSchema.parse(cell)).not.toThrow();
    }
  });

  it('generateMonthlyChart returns 12 increasing points', () => {
    const points = generateMonthlyChart();
    expect(points).toHaveLength(12);
    for (const point of points) {
      expect(() => monthlyChartPointSchema.parse(point)).not.toThrow();
    }
    // Users accumulate (random walk only adds).
    expect(points[11]!.users).toBeGreaterThan(points[0]!.users);
  });

  it('generateWeeklyChart returns 7 schema-valid points', () => {
    const points = generateWeeklyChart();
    expect(points).toHaveLength(7);
    for (const point of points) {
      expect(() => weeklyChartPointSchema.parse(point)).not.toThrow();
      expect(point.signups).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces varied output across calls', () => {
    const a = generateStats().map((s) => s.value);
    const b = generateStats().map((s) => s.value);
    // Extremely unlikely all four values match across two random draws.
    expect(a).not.toEqual(b);
  });
});
