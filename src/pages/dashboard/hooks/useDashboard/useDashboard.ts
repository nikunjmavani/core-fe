import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dashboardApi } from '../../dashboard.api.ts';
import type { ActivityItem } from '../../dashboard.contracts.ts';

const QUERY_KEYS = {
  all: ['dashboard'] as const,
  stats: () => [...QUERY_KEYS.all, 'stats'] as const,
  activity: () => [...QUERY_KEYS.all, 'activity'] as const,
  goals: () => [...QUERY_KEYS.all, 'goals'] as const,
  heatmap: () => [...QUERY_KEYS.all, 'heatmap'] as const,
  monthlyChart: () => [...QUERY_KEYS.all, 'charts', 'monthly'] as const,
  weeklyChart: () => [...QUERY_KEYS.all, 'charts', 'weekly'] as const,
};

/** How often the simulated live feed polls for a new event. */
const LIVE_POLL_MS = 5000;
/** Maximum number of events kept in the live feed. */
const LIVE_FEED_MAX = 7;

/** Prepend a new event and cap the feed length (module-level to limit nesting). */
function prependEvent(prev: ActivityItem[], event: ActivityItem): ActivityItem[] {
  return [event, ...prev].slice(0, LIVE_FEED_MAX);
}

/** Swallow polling errors — the simulated stream is best-effort. */
function ignoreError(): undefined {
  return undefined;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats(),
    queryFn: dashboardApi.getStats,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: QUERY_KEYS.activity(),
    queryFn: dashboardApi.getActivity,
  });
}

export function useDashboardGoals() {
  return useQuery({
    queryKey: QUERY_KEYS.goals(),
    queryFn: dashboardApi.getGoals,
  });
}

export function useDashboardHeatmap() {
  return useQuery({
    queryKey: QUERY_KEYS.heatmap(),
    queryFn: dashboardApi.getHeatmap,
  });
}

/**
 * Live-streaming activity feed.
 *
 * Starts from the initial activity list, then polls
 * {@link dashboardApi.getLatestEvent} on an interval and prepends each new event
 * (capped to {@link LIVE_FEED_MAX}). State is only updated from the timer
 * callback — never synchronously in the effect — to avoid cascading renders.
 * Mimics a websocket stream; swap `getLatestEvent` for a real WS/SSE source later.
 */
export function useLiveActivity(seed: ActivityItem[] | undefined) {
  const [streamed, setStreamed] = useState<ActivityItem[]>([]);
  const streamedRef = useRef<ActivityItem[]>([]);
  const hasSeed = Boolean(seed && seed.length > 0);

  const pushEvent = useCallback((event: ActivityItem) => {
    streamedRef.current = prependEvent(streamedRef.current, event);
    setStreamed(streamedRef.current);
  }, []);

  useEffect(() => {
    if (!hasSeed) return;
    const tick = () => {
      dashboardApi.getLatestEvent().then(pushEvent).catch(ignoreError);
    };
    const interval = setInterval(tick, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [hasSeed, pushEvent]);

  return useMemo(
    () => [...streamed, ...(seed ?? [])].slice(0, LIVE_FEED_MAX),
    [streamed, seed],
  );
}

export function useMonthlyChartData() {
  return useQuery({
    queryKey: QUERY_KEYS.monthlyChart(),
    queryFn: dashboardApi.getMonthlyChartData,
  });
}

export function useWeeklyChartData() {
  return useQuery({
    queryKey: QUERY_KEYS.weeklyChart(),
    queryFn: dashboardApi.getWeeklyChartData,
  });
}
