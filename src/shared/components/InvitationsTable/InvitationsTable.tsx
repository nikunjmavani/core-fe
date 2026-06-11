import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { RotateCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Invitation } from '@/shared/api/organization-contracts.ts';
import { DataTable } from '@/shared/components/data-table/DataTable.tsx';
import { DataTableColumnHeader } from '@/shared/components/data-table/DataTableColumnHeader.tsx';
import { DataTableToolbar } from '@/shared/components/data-table/DataTableToolbar.tsx';
import {
  InvitationStatusBadge,
  RoleBadge,
} from '@/shared/components/OrganizationBadges/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  useResendInvitation,
  useRevokeInvitation,
} from '@/shared/hooks/useInvitations/index.ts';
import { useHasPermission } from '@/shared/hooks/useRBAC/index.ts';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function InvitationActions({
  invitation,
  onRevoke,
  onResend,
}: {
  invitation: Invitation;
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}) {
  if (invitation.status !== 'pending' && invitation.status !== 'expired') return null;
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => onResend(invitation.id)}
        data-testid={`invitation-resend-${invitation.id}`}
      >
        <RotateCw className="mr-1 h-4 w-4" />
        Resend
      </Button>
      {invitation.status === 'pending' ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => onRevoke(invitation.id)}
          data-testid={`invitation-revoke-${invitation.id}`}
        >
          <X className="mr-1 h-4 w-4" />
          Revoke
        </Button>
      ) : null}
    </div>
  );
}

function buildColumns(
  canManage: boolean,
  onRevoke: (id: string) => void,
  onResend: (id: string) => void,
): ColumnDef<Invitation>[] {
  return [
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <InvitationStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'invitedByName',
      header: 'Invited by',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.invitedByName}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canManage ? (
          <InvitationActions
            invitation={row.original}
            onRevoke={onRevoke}
            onResend={onResend}
          />
        ) : null,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

/**
 * Invitations table: search by email, sort, pagination, and permission-gated
 * revoke action for pending invitations.
 *
 * @param props.invitations - The invitations to display.
 */
export function InvitationsTable({ invitations }: { invitations: Invitation[] }) {
  const canManage = useHasPermission('invitation:manage');
  const revoke = useRevokeInvitation();
  const resend = useResendInvitation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () =>
      buildColumns(
        canManage,
        (id) => revoke.mutate(id),
        (id) => resend.mutate(id),
      ),
    [canManage, revoke, resend],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions by design
  const table = useReactTable({
    data: invitations,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4" data-testid="invitations-table">
      <DataTableToolbar
        table={table}
        searchColumnId="email"
        searchPlaceholder="Search invitations…"
      />
      <div className="rounded-md border">
        <DataTable table={table} emptyMessage="No invitations." />
      </div>
    </div>
  );
}
