import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RoleSummary } from '@/shared/api/organization-contracts.ts';
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
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card } from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useDeleteRole, useRoles } from '@/shared/hooks/useRoles/index.ts';
import { ShieldCheck, Trash2 } from '@/shared/icons/index.ts';
import { notifyDeferredCommit } from '@/shared/notify/notify-deferred.ts';

function RolesLoading() {
  return (
    <div className="space-y-2" data-testid="roles-loading">
      {['a', 'b', 'c'].map((key) => (
        <Skeleton key={key} className="h-14 w-full" />
      ))}
    </div>
  );
}

/**
 * Roles panel — permission sets assignable to members. System roles are read-only;
 * custom roles can be deleted with undo-capable deferred commit.
 */
export function OrganizationRolesPanel() {
  const { t } = useTranslation(SETTINGS_NS);
  const rolesQuery = useRoles();
  const canManage = useCan({ permission: 'role:manage', teamOrganizationOnly: true });
  const deleteRole = useDeleteRole();
  const [toDelete, setToDelete] = useState<RoleSummary | null>(null);

  const panels = SETTINGS_KEYS.panels.roles;
  const breadcrumb = formatSettingsBreadcrumb(
    t(SETTINGS_GROUP_LABEL_KEYS.organization),
    t(SETTINGS_SECTION_LABEL_KEYS.roles),
  );

  return (
    <section className="space-y-6" data-testid="settings-organization-roles">
      <SectionHeader
        breadcrumb={breadcrumb}
        title={t(panels.title)}
        description={t(panels.description)}
      />

      <QueryBoundary
        query={rolesQuery}
        errorMessage={t(panels.loadFailed)}
        loading={<RolesLoading />}
      >
        {(roles) => (
          <>
            {roles.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck />}
                title={t(panels.emptyTitle)}
                description={t(panels.emptyDescription)}
              />
            ) : (
              <Card className="gap-0 overflow-hidden py-0">
                <ul className="divide-border divide-y" data-testid="roles-list">
                  {roles.map((role) => (
                    <li key={role.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{role.name}</p>
                          {role.isSystem ? (
                            <Badge variant="outline">{t(panels.systemBadge)}</Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground truncate text-xs">
                          {role.description}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {t(panels.memberCount, { count: role.memberCount })}
                      </span>
                      {canManage && !role.isSystem ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t(panels.deleteAria, { name: role.name })}
                          onClick={() => setToDelete(role)}
                          data-testid={`role-delete-${role.id}`}
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
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={t(panels.deleteTitle, { name: toDelete?.name ?? 'role' })}
        description={t(panels.deleteDescription)}
        confirmLabel={t(panels.deleteConfirm)}
        destructive
        onConfirm={() => {
          if (!toDelete) return;
          const role = toDelete;
          setToDelete(null);
          notifyDeferredCommit({
            pendingMessage: t(panels.deletePending, { name: role.name }),
            toastId: `delete-role-${role.id}`,
            onCommit: () => deleteRole.mutate(role.id),
          });
        }}
      />
    </section>
  );
}
