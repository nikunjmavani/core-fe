import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  Clock,
  MoreHorizontal,
  RotateCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import { AnimatedSection, AnimatedTabs } from '@/lib/animations/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { WidgetErrorBoundary } from '@/shared/components/WidgetErrorBoundary.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { ActivityFeed } from './components/ActivityFeed/index.ts';
import { ActivityHeatmap } from './components/ActivityHeatmap/index.ts';
import { MonthlyTargets } from './components/MonthlyTargets/index.ts';
import { StatCards } from './components/StatCards/index.ts';
import { TeamSection } from './components/TeamSection/index.ts';
import { page } from './dashboard.page.ts';
import {
  useDashboardActivity,
  useDashboardGoals,
  useDashboardHeatmap,
  useDashboardStats,
} from './hooks/useDashboard/index.ts';

const LazyDashboardCharts = lazy(() =>
  import('./components/DashboardCharts/index.ts').then((m) => ({
    default: m.DashboardCharts,
  })),
);

const CHART_TABS = [
  { id: 'growth', label: 'User Growth' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'signups', label: 'Weekly Signups' },
];

const QUICK_ACTIONS = [
  { id: 'invite-user', label: 'Invite user', icon: Users },
  { id: 'new-organization', label: 'New organization', icon: Building2 },
  { id: 'view-reports', label: 'View reports', icon: TrendingUp },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Small pulsing "Live" indicator for the streaming activity feed. */
function LiveIndicator() {
  return (
    <span
      className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
      data-testid="activity-live"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

export function DashboardPage() {
  const [activeChart, setActiveChart] = useState('growth');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const stats = useDashboardStats();
  const activity = useDashboardActivity();
  const goals = useDashboardGoals();
  const heatmap = useDashboardHeatmap();

  const greeting = getGreeting();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }).catch(() => undefined);
  };

  return (
    <div className="space-y-8" data-testid={page.testId}>
      {/* Header */}
      <AnimatedSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-foreground text-3xl font-bold tracking-tight"
              data-testid="dashboard-greeting"
            >
              {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening across your platform today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="dashboard-date-range">
              <CalendarDays className="mr-2 h-4 w-4" />
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              data-testid="dashboard-refresh"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" data-testid="dashboard-download-report">
              Download report
            </Button>
          </div>
        </div>
      </AnimatedSection>

      {/* Stat Cards */}
      <WidgetErrorBoundary title="Overview" testId="widget-error-stats">
        <StatCards stats={stats.data} isLoading={stats.isPending} />
      </WidgetErrorBoundary>

      {/* Charts + Live Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        <AnimatedSection className="lg:col-span-4">
          <WidgetErrorBoundary title="Analytics" testId="widget-error-analytics">
            <Card className="h-full" data-testid="dashboard-analytics-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Analytics
                    </CardTitle>
                    <CardDescription>Platform performance over time</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="More options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <AnimatedTabs
                  tabs={CHART_TABS}
                  activeTab={activeChart}
                  onTabChange={setActiveChart}
                  className="mt-2"
                  testIdPrefix="dashboard-chart-tab"
                />
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div
                      className="text-muted-foreground flex h-[300px] items-center justify-center"
                      role="status"
                      aria-live="polite"
                    >
                      Loading charts…
                    </div>
                  }
                >
                  <LazyDashboardCharts activeChart={activeChart} />
                </Suspense>
              </CardContent>
            </Card>
          </WidgetErrorBoundary>
        </AnimatedSection>

        <AnimatedSection className="lg:col-span-3">
          <WidgetErrorBoundary title="Recent Activity" testId="widget-error-activity">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest actions across the platform</CardDescription>
                  </div>
                  <LiveIndicator />
                </div>
              </CardHeader>
              <CardContent>
                <ActivityFeed seed={activity.data} isLoading={activity.isPending} />
              </CardContent>
            </Card>
          </WidgetErrorBoundary>
        </AnimatedSection>
      </div>

      {/* Activity heatmap + Monthly targets */}
      <div className="grid gap-6 lg:grid-cols-7">
        <AnimatedSection className="lg:col-span-4">
          <WidgetErrorBoundary title="Platform Activity" testId="widget-error-heatmap">
            <ActivityHeatmap data={heatmap.data} isLoading={heatmap.isPending} />
          </WidgetErrorBoundary>
        </AnimatedSection>
        <AnimatedSection className="lg:col-span-3">
          <WidgetErrorBoundary title="Monthly Targets" testId="widget-error-targets">
            <MonthlyTargets goals={goals.data} isLoading={goals.isPending} />
          </WidgetErrorBoundary>
        </AnimatedSection>
      </div>

      {/* Quick Actions */}
      <AnimatedSection>
        <Card data-testid="dashboard-quick-actions">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  data-testid={`dashboard-quick-action-${action.id}`}
                >
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <action.icon className="text-primary h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      {/* Team: members + pending invitations */}
      <AnimatedSection>
        <WidgetErrorBoundary title="Team" testId="widget-error-team">
          <TeamSection />
        </WidgetErrorBoundary>
      </AnimatedSection>
    </div>
  );
}
