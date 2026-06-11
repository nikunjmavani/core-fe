/**
 * Placeholder — the dashboard module is intentionally empty so it adds no
 * weight to reviews/AI context. It will be designed module-by-module after
 * auth is finalized (REPLACE_WITH_MODULE).
 */
export function DashboardPage() {
  return (
    <div data-testid="dashboard-page" className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight" data-testid="dashboard-greeting">
        Dashboard
      </h1>
      <p className="text-muted-foreground text-sm">
        This module is a placeholder. Auth is being finalized first; the dashboard is
        built after that, one module at a time.
      </p>
    </div>
  );
}
