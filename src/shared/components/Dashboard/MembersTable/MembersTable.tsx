import { useTranslation } from 'react-i18next';

import { iconChipClassName } from '@/lib/icon-surface.ts';
import { cn } from '@/lib/utils.ts';
import {
  DASHBOARD_KEYS,
  DASHBOARD_NS,
  DASHBOARD_TEST_IDS,
  MEMBER_STATUS_META,
} from '@/shared/components/Dashboard/dashboard.constants.ts';
import { DASHBOARD_MEMBERS } from '@/shared/components/Dashboard/dashboard.placeholder-data.ts';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx';
import { Badge } from '@/shared/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table.tsx';
import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';
import { Users } from '@/shared/icons/index.ts';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Team-member roster — a real admin surface (who's in the workspace, their role,
 * status, and join date) built on the shadcn `Table`. Doubles as a theme-axis
 * testbed: borders/density on rows, radius on the card + avatars + badges, and
 * the join date rendered through the user's locale format.
 */
export function MembersTable() {
  const { t } = useTranslation(DASHBOARD_NS);
  const { formatDate } = useLocaleFormat();

  return (
    <Card data-testid={DASHBOARD_TEST_IDS.membersTable}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            data-slot="icon-chip"
            className={cn('bg-primary/10 text-primary size-9', iconChipClassName)}
            aria-hidden="true"
          >
            <Users className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">
              {t(DASHBOARD_KEYS.members.heading)}
            </CardTitle>
            <CardDescription>
              {t(DASHBOARD_KEYS.members.description, { count: DASHBOARD_MEMBERS.length })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(DASHBOARD_KEYS.members.columnMember)}</TableHead>
              <TableHead>{t(DASHBOARD_KEYS.members.columnRole)}</TableHead>
              <TableHead>{t(DASHBOARD_KEYS.members.columnStatus)}</TableHead>
              <TableHead className="text-right">
                {t(DASHBOARD_KEYS.members.columnJoined)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DASHBOARD_MEMBERS.map((member) => {
              const status = MEMBER_STATUS_META[member.status];
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.role}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{t(status.key)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {formatDate(member.joinedIso)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
