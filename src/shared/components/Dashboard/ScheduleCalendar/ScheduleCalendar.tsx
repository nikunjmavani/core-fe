import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { iconChipClassName } from '@/lib/icon-surface.ts';
import { cn } from '@/lib/utils.ts';
import {
  DASHBOARD_KEYS,
  DASHBOARD_NS,
  DASHBOARD_TEST_IDS,
} from '@/shared/components/Dashboard/dashboard.constants.ts';
import { resolveDashboardEvents } from '@/shared/components/Dashboard/dashboard.placeholder-data.ts';
import { Calendar } from '@/shared/components/ui/calendar.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';
import { CalendarDays } from '@/shared/icons/index.ts';

/**
 * Schedule widget — a real "what's coming up" surface (renewals, reviews, team
 * events) built on the shadcn `Calendar`. Event days are highlighted with
 * semantic-token modifiers and listed below, so the calendar exercises radius,
 * density, accent colour, and the selected/today states across theme axes.
 */
export function ScheduleCalendar() {
  const { t } = useTranslation(DASHBOARD_NS);
  const { formatDate } = useLocaleFormat();
  const events = useMemo(() => resolveDashboardEvents(), []);
  const [selected, setSelected] = useState<Date | undefined>(() => events[0]?.date);

  const eventDays = useMemo(() => events.map((event) => event.date), [events]);

  return (
    <Card data-testid={DASHBOARD_TEST_IDS.scheduleCalendar}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            data-slot="icon-chip"
            className={cn('bg-primary/10 text-primary size-9', iconChipClassName)}
            aria-hidden="true"
          >
            <CalendarDays className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">
              {t(DASHBOARD_KEYS.schedule.heading)}
            </CardTitle>
            <CardDescription>{t(DASHBOARD_KEYS.schedule.description)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ event: eventDays }}
            modifiersClassNames={{
              event:
                'bg-primary/10 rounded-md [&_button]:font-medium [&_button]:text-primary',
            }}
            className="p-0"
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t(DASHBOARD_KEYS.schedule.upcoming)}
          </p>
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="flex items-center gap-3 text-sm">
                <span
                  className="bg-primary size-2 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground tabular-nums">
                  {formatDate(event.date)}
                </span>
                <span className="truncate font-medium">{event.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
