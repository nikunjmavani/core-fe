import { useState } from 'react';

import type { Member } from '@/shared/api/organization-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useMembers, useRemoveMember } from '@/shared/hooks/useMembers/index.ts';
import { Trash2, Users } from '@/shared/icons/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

function initials(name: string): string {
  const letters = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || '?';
}

function statusVariant(
  status: Member['status'],
): 'secondary' | 'destructive' | 'outline' {
  if (status === 'suspended') return 'destructive';
  if (status === 'invited') return 'outline';
  return 'secondary';
}

/**
 * Members panel — the active organization's people. Lists members with their
 * role + status; removal is gated on the membership:manage permission (team
 * orgs only, so the control is hidden in a personal org) and confirmed via
 * the shared destructive-action dialog. Covers loading / empty / error states.
 */
export function OrganizationMembersPanel() {
  const { data: members, isLoading, isError } = useMembers();
  const canManage = useCan({
    permission: 'membership:manage',
    teamOrganizationOnly: true,
  });
  const removeMember = useRemoveMember();
  const [toRemove, setToRemove] = useState<Member | null>(null);

  return (
    <section className="space-y-6" data-testid="settings-organization-members">
      <SectionHeader title="Members" description="People in this organization." />

      {isLoading ? (
        <div className="space-y-2" data-testid="members-loading">
          {['a', 'b', 'c'].map((key) => (
            <Skeleton key={key} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          Couldn&apos;t load members. Please try again.
        </p>
      ) : null}

      {members && members.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No members yet"
          description="Invite teammates to collaborate in this organization."
        />
      ) : null}

      {members && members.length > 0 ? (
        <ul
          className="divide-border bg-card divide-y rounded-lg border"
          data-testid="members-list"
        >
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 p-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="text-muted-foreground truncate text-xs">{member.email}</p>
              </div>
              <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                {member.role}
              </Badge>
              <Badge variant={statusVariant(member.status)} className="capitalize">
                {member.status}
              </Badge>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setToRemove(member)}
                  data-testid={`member-remove-${member.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
        title={`Remove ${toRemove?.name ?? 'member'}?`}
        description="They'll lose access to this organization. This can't be undone."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (toRemove) await removeMember.mutateAsync(toRemove.id);
        }}
      />
    </section>
  );
}
