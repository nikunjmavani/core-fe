import type { ReactNode } from 'react';

import { useAnimeCountUp } from '@/lib/animations/useAnimeCountUp.ts';
import { iconChipClassName } from '@/lib/icon-surface.ts';
import { cn } from '@/lib/utils.ts';
import type { LucideIcon } from '@/shared/icons/index.ts';

type DashboardStatRowProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  testId: string;
};

/** Single stat row — used inside {@link DashboardStatsPanel}. */
export function DashboardStatRow({
  icon: Icon,
  label,
  value,
  hint,
  testId,
}: DashboardStatRowProps) {
  const numericValue = typeof value === 'number' ? value : null;
  const animated = useAnimeCountUp(numericValue ?? 0, 720);
  const displayValue =
    numericValue !== null ? Math.round(animated).toLocaleString() : value;

  return (
    <div data-testid={testId} className="flex items-center gap-2.5 px-3 py-2.5 sm:px-4">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs leading-none font-medium">{label}</p>
        <p className="text-card-foreground mt-0.5 text-sm font-semibold tabular-nums">
          {displayValue}
        </p>
        {hint ? (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Elevated KPI tile for the dashboard bento grid. */
export function DashboardKpiTile({
  icon: Icon,
  label,
  value,
  hint,
  testId,
}: DashboardStatRowProps) {
  const numericValue = typeof value === 'number' ? value : null;
  const animated = useAnimeCountUp(numericValue ?? 0, 720);
  const displayValue =
    numericValue !== null ? Math.round(animated).toLocaleString() : value;

  return (
    <article
      data-testid={testId}
      className="border-border/70 bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <div
          data-slot="icon-chip"
          className={cn('bg-muted text-muted-foreground size-8', iconChipClassName)}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div>
        <p className="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
          {displayValue}
        </p>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      </div>
    </article>
  );
}

type DashboardStatsPanelProps = {
  children: ReactNode;
  'aria-label': string;
};

/** One bordered surface for all workspace stats — avoids four stacked cards. */
export function DashboardStatsPanel({
  children,
  'aria-label': ariaLabel,
}: DashboardStatsPanelProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="border-border/70 bg-card text-card-foreground divide-border/60 divide-y overflow-hidden rounded-xl border"
    >
      {children}
    </section>
  );
}

/** @deprecated Prefer {@link DashboardKpiTile} or {@link DashboardStatRow}. */
export function DashboardStatCard({
  icon,
  label,
  value,
  hint,
  testId,
  compact: _compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  testId: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('border-border/70 bg-card rounded-xl border')}>
      <DashboardStatRow
        icon={icon}
        label={label}
        value={value}
        hint={hint}
        testId={testId}
      />
    </div>
  );
}
