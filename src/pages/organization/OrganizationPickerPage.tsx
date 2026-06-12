import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { organizationDashboard } from '@/lib/routes/index.ts';
import { CreateOrganizationDialog } from '@/shared/components/CreateOrganizationDialog/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Card, CardContent } from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { Building2, ChevronRight, Plus } from '@/shared/icons/index.ts';
import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';

/**
 * Organization picker — choose which organization to enter. Selecting one
 * navigates to its dashboard; the organization guard syncs context from the
 * URL and persists the choice for the `/` resolver.
 */
export function OrganizationPickerPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: listMyOrganizations,
  });

  return (
    <main
      className="bg-background flex min-h-screen items-center justify-center p-6"
      data-testid="organization-page"
    >
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Select organization</h1>
          <p className="text-muted-foreground text-sm">
            Choose an organization to continue, or create a new one.
          </p>
        </header>

        <div className="space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}
          {!isLoading &&
            organizations.map((organization) => (
              <Card
                key={organization.id}
                className="hover:bg-muted/50 cursor-pointer py-0 transition-colors"
                onClick={() => void navigate(organizationDashboard(organization.id))}
                data-testid={`organization-picker-option-${organization.slug}`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{organization.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {organization.slug}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                </CardContent>
              </Card>
            ))}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setCreateOpen(true)}
          data-testid="organization-picker-create"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create organization
        </Button>
      </div>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
