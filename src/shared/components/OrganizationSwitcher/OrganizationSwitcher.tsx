import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { organizationDashboard } from '@/lib/routes/index.ts';
import { cn } from '@/lib/utils.ts';
import { CreateOrganizationDialog } from '@/shared/components/CreateOrganizationDialog/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu.tsx';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { Check, ChevronsUpDown, Plus } from '@/shared/icons/index.ts';
import type { OrganizationSummary } from '@/shared/tenancy/me-context.ts';
import { switchToPersonal } from '@/shared/tenancy/switch.ts';

interface OrganizationSwitcherProps {
  /** Extra classes for the trigger button (e.g. `flex-1` inside the sidebar). */
  className?: string;
  /** Dropdown alignment relative to the trigger. */
  align?: 'start' | 'end';
}

function initialOf(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/**
 * Active-organization switcher (dual-URL aware, FE-24). Lists the user's
 * organizations from `me/context`, split into **Personal** and **Organizations**
 * sections. Switching to a **team** org navigates to its
 * `/organization/$organizationSlug/dashboard` (the org guard performs the
 * switch-on-navigation); switching to the **personal** org has no URL to drive
 * it, so it calls `switchToPersonal()` and lands on the root `/dashboard`.
 */
export function OrganizationSwitcher({
  className,
  align = 'start',
}: OrganizationSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { data: ctx, isLoading } = useMeContext();

  const orgs = ctx?.organizations ?? [];
  const personalOrgs = orgs.filter((o) => o.type === 'PERSONAL');
  const teamOrgs = orgs.filter((o) => o.type === 'TEAM');
  const activeId = ctx?.activeOrganization?.id;
  const activeName = ctx?.activeOrganization?.name ?? 'Select organization';

  async function applySelect(org: OrganizationSummary) {
    if (org.id === activeId) return;
    if (org.type === 'PERSONAL') {
      await switchToPersonal();
      void navigate({ to: '/dashboard' });
      return;
    }
    // Team orgs carry a slug; the guard resolves it to the canonical org.
    if (org.slug) void navigate(organizationDashboard(org.slug));
  }

  function selectOrg(org: OrganizationSummary) {
    applySelect(org).catch(() => undefined);
  }

  const renderOrg = (org: OrganizationSummary) => (
    <DropdownMenuItem
      key={org.id}
      onClick={() => selectOrg(org)}
      data-testid={`organization-switcher-option-${org.slug ?? 'personal'}`}
      className="gap-2"
    >
      <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
        {initialOf(org.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{org.name}</span>
        {org.slug ? (
          <span className="text-muted-foreground block truncate text-xs">{org.slug}</span>
        ) : null}
      </span>
      {org.id === activeId ? (
        <Check className="text-primary ml-auto size-4 shrink-0" aria-hidden />
      ) : null}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-9 min-w-0 justify-start gap-2', className)}
            disabled={isLoading}
            data-testid="organization-switcher-trigger"
          >
            <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold">
              {initialOf(activeName)}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {activeName}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-64">
          {personalOrgs.length > 0 ? (
            <>
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                Personal
              </DropdownMenuLabel>
              {personalOrgs.map(renderOrg)}
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
            Organizations
          </DropdownMenuLabel>
          {teamOrgs.map(renderOrg)}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCreateOpen(true);
            }}
            data-testid="organization-switcher-create"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
