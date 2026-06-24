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
import { Building2, Check, ChevronsUpDown, Plus } from '@/shared/icons/index.ts';
import type { OrganizationSummary } from '@/shared/tenancy/me-context.ts';
import { switchToPersonal } from '@/shared/tenancy/switch.ts';

interface OrganizationSwitcherProps {
  /** Extra classes for the trigger button (e.g. `flex-1` inside the sidebar). */
  className?: string;
  /** Dropdown alignment relative to the trigger. */
  align?: 'start' | 'end';
}

/**
 * Active-organization switcher (dual-URL aware, FE-24). Lists the user's
 * organizations from `me/context` (the authoritative set, including the personal
 * org). Switching to a **team** org navigates to its
 * `/organization/$organizationSlug/dashboard` — the org guard performs the
 * switch-on-navigation. Switching to the **personal** org has no URL to drive
 * the switch, so it calls `switchToPersonal()` (re-mints the token) then lands
 * on the root `/dashboard`.
 */
export function OrganizationSwitcher({
  className,
  align = 'start',
}: OrganizationSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const { data: ctx, isLoading } = useMeContext();

  const orgs = ctx?.organizations ?? [];
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
            <Building2 className="text-primary h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {activeName}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-60">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => selectOrg(org)}
              data-testid={`organization-switcher-option-${org.slug ?? 'personal'}`}
            >
              <Building2 className="mr-2 h-4 w-4 opacity-70" />
              <span className="truncate">{org.name}</span>
              {org.id === activeId && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCreateOpen(true);
            }}
            data-testid="organization-switcher-create"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
