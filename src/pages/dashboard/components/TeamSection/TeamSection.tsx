import { useNavigate, useSearch } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { InvitationsTable } from '@/shared/components/InvitationsTable.tsx';
import { MembersTable } from '@/shared/components/MembersTable.tsx';
import { RetryError } from '@/shared/components/RetryError.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs.tsx';
import { useInvitations, useMembers } from '@/shared/hooks/useOrganization.ts';

import type { DashboardSearch } from '../../dashboard.search.ts';

const SKELETON_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5'];

function TableSkeleton() {
  return (
    <div className="space-y-3" data-testid="team-skeleton">
      <Skeleton className="h-8 w-64" />
      {SKELETON_ROWS.map((key) => (
        <Skeleton key={key} className="h-12 w-full" />
      ))}
    </div>
  );
}

function MembersPanel() {
  const members = useMembers();
  if (members.isPending) return <TableSkeleton />;
  if (members.isError) {
    return (
      <RetryError
        message="Could not load members."
        onRetry={() => {
          members.refetch().catch(() => undefined);
        }}
        isRetrying={members.isFetching}
      />
    );
  }
  return <MembersTable members={members.data} syncUrl />;
}

function InvitationsPanel() {
  const invitations = useInvitations();
  if (invitations.isPending) return <TableSkeleton />;
  if (invitations.isError) {
    return (
      <RetryError
        message="Could not load invitations."
        onRetry={() => {
          invitations.refetch().catch(() => undefined);
        }}
        isRetrying={invitations.isFetching}
      />
    );
  }
  return <InvitationsTable invitations={invitations.data} />;
}

/**
 * Dashboard team section — organization members and pending invitations in a
 * tabbed, feature-rich data table. Server data via TanStack Query.
 */
export function TeamSection() {
  const members = useMembers();
  const invitations = useInvitations();
  const search = useSearch({ strict: false }) as DashboardSearch;
  const navigate = useNavigate();
  const activeTab = search.team === 'invitations' ? 'invitations' : 'members';

  const memberCount = members.data?.length ?? 0;
  const pendingCount =
    invitations.data?.filter((i) => i.status === 'pending').length ?? 0;

  return (
    <Card data-testid="team-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team
        </CardTitle>
        <CardDescription>
          Manage members and invitations for this organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const team: DashboardSearch['team'] =
              value === 'invitations' ? 'invitations' : 'members';
            navigate({
              to: '/',
              search: (prev: DashboardSearch) => ({ ...prev, team }),
              replace: true,
            }).catch(() => undefined);
          }}
        >
          <TabsList>
            <TabsTrigger value="members" data-testid="team-tab-members">
              Members{memberCount > 0 ? ` (${memberCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="team-tab-invitations">
              Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <MembersPanel />
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            <InvitationsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
