import { useQuery } from '@tanstack/react-query';

import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Organization general settings — thin in-dialog view for org name & slug.
 * Dense surfaces (members, roles, billing, invitations) live on full pages —
 * see {@link './OrgQuickLinksSection.tsx'}.
 *
 * REPLACE_WITH_API: PATCH /api/v1/organizations/me
 */
export function OrganizationGeneralPanel() {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationSlug = useOrganizationStore((s) => s.organizationSlug);
  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: listMyOrganizations,
  });
  const activeOrg = orgs?.find((o) => o.id === organizationId);

  return (
    <div className="space-y-6" data-testid="settings-section-org-general">
      <SectionHeader
        title="Organization · General"
        description="Identity for your organization across the platform."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
          <CardDescription>
            These appear in the org switcher, invites, and email receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              defaultValue={activeOrg?.name ?? ''}
              placeholder="Acme Inc."
              data-testid="org-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              defaultValue={activeOrg?.slug ?? organizationSlug ?? ''}
              placeholder="acme"
              data-testid="org-slug"
            />
            <p className="text-muted-foreground text-xs">
              Used in URLs and API paths. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <div className="flex justify-end">
            <Button size="sm" data-testid="org-general-save">
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
