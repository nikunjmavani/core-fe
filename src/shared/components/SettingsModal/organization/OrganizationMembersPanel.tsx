import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Member } from '@/shared/api/organization-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { QueryBoundary } from '@/shared/components/QueryBoundary/index.ts';
import {
  formatSettingsBreadcrumb,
  SETTINGS_GROUP_LABEL_KEYS,
  SETTINGS_KEYS,
  SETTINGS_NS,
  SETTINGS_SECTION_LABEL_KEYS,
} from '@/shared/components/SettingsModal/settings.constants.ts';
import { SectionHeader } from '@/shared/components/SettingsModal/SettingsPanelShell.tsx';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar.tsx';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card } from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useMembers, useRemoveMember } from '@/shared/hooks/useMembers/index.ts';
import { Trash2, Users } from '@/shared/icons/index.ts';
import { notifyDeferredCommit } from '@/shared/notify/notify-deferred.ts';

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

function MembersLoading() {
  return (
    <div className="space-y-2" data-testid="members-loading">
      {['a', 'b', 'c'].map((key) => (
        <Skeleton key={key} className="h-14 w-full" />
      ))}
    </div>
  );
}

/**
 * Members panel — the active organization's people. Lists members with their
 * role + status; removal is gated on the membership:manage permission (team
 * orgs only) and confirmed via undo-capable deferred commit.
 */
export function OrganizationMembersPanel() {
  const { t } = useTranslation(SETTINGS_NS);
  const membersQuery = useMembers();
  const canManage = useCan({
    permission: 'membership:manage',
    teamOrganizationOnly: true,
  });
  const removeMember = useRemoveMember();
  const [toRemove, setToRemove] = useState<Member | null>(null);

  const panels = SETTINGS_KEYS.panels.members;
  const breadcrumb = formatSettingsBreadcrumb(
    t(SETTINGS_GROUP_LABEL_KEYS.organization),
    t(SETTINGS_SECTION_LABEL_KEYS.members),
  );

  return (
    <section className="space-y-6" data-testid="settings-organization-members">
      <SectionHeader
        breadcrumb={breadcrumb}
        title={t(panels.title)}
        description={t(panels.description)}
      />

      <QueryBoundary
        query={membersQuery}
        errorMessage={t(panels.loadFailed)}
        loading={<MembersLoading />}
      >
        {(members) => (
          <>
            {members.length === 0 ? (
              <EmptyState
                icon={<Users />}
                title={t(panels.emptyTitle)}
                description={t(panels.emptyDescription)}
              />
            ) : (
              <Card className="gap-0 overflow-hidden py-0">
                <ul className="divide-border divide-y" data-testid="members-list">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 p-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="hidden capitalize sm:inline-flex"
                      >
                        {member.role}
                      </Badge>
                      <Badge
                        variant={statusVariant(member.status)}
                        className="capitalize"
                      >
                        {member.status}
                      </Badge>
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t(panels.removeAria, { name: member.name })}
                          onClick={() => setToRemove(member)}
                          data-testid={`member-remove-${member.id}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
        title={t(panels.removeTitle, { name: toRemove?.name ?? 'member' })}
        description={t(panels.removeDescription)}
        confirmLabel={t(panels.removeConfirm)}
        destructive
        onConfirm={() => {
          if (!toRemove) return;
          const member = toRemove;
          setToRemove(null);
          notifyDeferredCommit({
            pendingMessage: t(panels.removePending, { name: member.name }),
            toastId: `remove-member-${member.id}`,
            onCommit: () => removeMember.mutate(member.id),
          });
        }}
      />
    </section>
  );
}
