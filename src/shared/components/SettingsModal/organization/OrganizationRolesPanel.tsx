import { useState } from 'react';

import type { RoleSummary } from '@/shared/api/organization-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useDeleteRole, useRoles } from '@/shared/hooks/useRoles/index.ts';
import { ShieldCheck, Trash2 } from '@/shared/icons/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Roles panel — the permission sets assignable to members. System roles are
 * read-only; custom roles can be deleted when the org allows it
 * (`canManageRoles`), confirmed via the shared destructive-action dialog.
 * Covers loading / empty / error states. (Create/edit-role form is a follow-up.)
 */
export function OrganizationRolesPanel() {
  const { data: roles, isLoading, isError } = useRoles();
  const canManage = useCan({ permission: 'role:manage', teamOrganizationOnly: true });
  const deleteRole = useDeleteRole();
  const [toDelete, setToDelete] = useState<RoleSummary | null>(null);

  return (
    <section className="space-y-6" data-testid="settings-organization-roles">
      <SectionHeader
        title="Roles"
        description="Permission sets you can assign to members."
      />

      {isLoading ? (
        <div className="space-y-2" data-testid="roles-loading">
          {['a', 'b', 'c'].map((key) => (
            <Skeleton key={key} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          Couldn&apos;t load roles. Please try again.
        </p>
      ) : null}

      {roles && roles.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No roles yet"
          description="Create a custom role to grant a tailored set of permissions."
        />
      ) : null}

      {roles && roles.length > 0 ? (
        <ul
          className="divide-border bg-card divide-y rounded-lg border"
          data-testid="roles-list"
        >
          {roles.map((role) => (
            <li key={role.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{role.name}</p>
                  {role.isSystem ? <Badge variant="outline">System</Badge> : null}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {role.description}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
              </span>
              {canManage && !role.isSystem ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${role.name}`}
                  onClick={() => setToDelete(role)}
                  data-testid={`role-delete-${role.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={`Delete ${toDelete?.name ?? 'role'}?`}
        description="Members with this role will need a new one assigned. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (toDelete) await deleteRole.mutateAsync(toDelete.id);
        }}
      />
    </section>
  );
}
