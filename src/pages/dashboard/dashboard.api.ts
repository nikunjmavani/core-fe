import { mockResponse } from '@/core/http/mock.ts';

import type {
  ActivityItem,
  DashboardStat,
  Goal,
  HeatCell,
  MonthlyChartPoint,
  WeeklyChartPoint,
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

/**
 * Dashboard data API.
 *
 * Backed by randomized mock generators via {@link mockResponse}; each call
 * returns fresh values so the dashboard feels live. Swap each generator for the
 * corresponding `apiClient` call once the backend is wired.
 */
export const dashboardApi = {
  getStats: (): Promise<DashboardStat[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/stats
    mockResponse(generateStats()),

  getActivity: (): Promise<ActivityItem[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/activity
    mockResponse(generateActivity()),

  /** Latest single event — polled to simulate a live stream (replace with WS/SSE). */
  getLatestEvent: (): Promise<ActivityItem> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/activity/latest (or websocket)
    mockResponse(generateActivityItem(), { delayMs: 150 }),

  getGoals: (): Promise<Goal[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/goals
    mockResponse(generateGoals()),

  getHeatmap: (): Promise<HeatCell[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/activity/heatmap
    mockResponse(generateHeatmap()),

  getMonthlyChartData: (): Promise<MonthlyChartPoint[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/charts/monthly
    mockResponse(generateMonthlyChart()),

  getWeeklyChartData: (): Promise<WeeklyChartPoint[]> =>
    // REPLACE_WITH_API: GET /api/v1/dashboard/charts/weekly
    mockResponse(generateWeeklyChart()),
};
