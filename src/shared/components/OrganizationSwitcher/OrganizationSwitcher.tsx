import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
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
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';

interface OrganizationSwitcherProps {
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
export function OrganizationSwitcher({
  className,
  align = 'start',
}: OrganizationSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationSlug = useOrganizationStore((s) => s.organizationSlug);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: listMyOrganizations,
  });

  const activeName =
    orgs.find((o) => o.id === organizationId)?.name ??
    organizationSlug ??
    'Select organization';

  // The URL drives organization context: navigating to the new organization's
  // dashboard runs the $organizationId guard, which syncs the store, persists
  // the last-used choice, and refetches permissions.
  const handleSelect = (id: string) => {
    void navigate(organizationDashboard(id));
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
              onClick={() => handleSelect(org.id)}
              data-testid={`organization-switcher-option-${org.slug}`}
            >
              <Building2 className="mr-2 h-4 w-4 opacity-70" />
              <span className="truncate">{org.name}</span>
              {org.id === organizationId && <Check className="ml-auto h-4 w-4" />}
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
