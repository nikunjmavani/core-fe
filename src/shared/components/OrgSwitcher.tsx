import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';
import { listMyOrganizations } from '@/shared/api/my-orgs.ts';
import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { CreateOrganizationDialog } from '@/shared/components/CreateOrganizationDialog.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu.tsx';
import {
  persistTenantToStorage,
  useTenantStore,
} from '@/shared/store/useTenantStore/index.ts';

interface OrgSwitcherProps {
  /** Extra classes for the trigger button (e.g. `flex-1` inside the sidebar). */
  className?: string;
  /** Dropdown alignment relative to the trigger. */
  align?: 'start' | 'end';
}

/**
 * Active-organization switcher. Lives at the top of the sidebar (to the right of
 * the product icon): lists the user's organizations, re-resolves org permissions
 * on switch, and exposes a "Create organization" action via a dialog.
 */
export function OrgSwitcher({ className, align = 'start' }: OrgSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const setTenant = useTenantStore((s) => s.setTenant);
  const setPermissions = useTenantStore((s) => s.setPermissions);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: listMyOrganizations,
  });

  const activeName =
    orgs.find((o) => o.id === tenantId)?.name ?? tenantSlug ?? 'Select org';

  const handleSelect = async (id: string, slug: string) => {
    setTenant(id, slug);
    persistTenantToStorage(id, slug);
    setPermissions(await getMyPermissions());
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-9 min-w-0 justify-start gap-2', className)}
            disabled={isLoading}
            data-testid="org-switcher-trigger"
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
              onClick={() => void handleSelect(org.id, org.slug)}
              data-testid={`org-switcher-option-${org.slug}`}
            >
              <Building2 className="mr-2 h-4 w-4 opacity-70" />
              <span className="truncate">{org.name}</span>
              {org.id === tenantId && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setCreateOpen(true);
            }}
            data-testid="org-switcher-create"
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
