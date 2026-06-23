import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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
import { useUpdateOrganization } from '@/shared/hooks/useUpdateOrganization/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Organization general settings — rename the active org (name-only; the slug
 * drives URLs and is read-only here). Gated on an admin capability
 * (`canManageMembers` — a personal org has it `false`). The editable name is
 * derived as a local draft over the server value (no prop→state effect); saving
 * full-updates via {@link useUpdateOrganization}.
 */
export function OrganizationGeneralPanel() {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationSlug = useOrganizationStore((s) => s.organizationSlug);
  const canManage = useOrganizationStore(
    (s) => s.capabilities?.canManageMembers ?? false,
  );
  const update = useUpdateOrganization();

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: listMyOrganizations,
  });
  const activeOrg = orgs?.find((o) => o.id === organizationId);

  const serverName = activeOrg?.name ?? '';
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? serverName;
  const trimmed = name.trim();
  const dirty = trimmed !== serverName && trimmed.length > 0;

  function save() {
    if (!dirty) return;
    update.mutate({ name: trimmed }, { onSuccess: () => setDraft(null) });
  }

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
              value={name}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Acme Inc."
              disabled={!canManage}
              data-testid="org-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={activeOrg?.slug ?? organizationSlug ?? ''}
              readOnly
              disabled
              data-testid="org-slug"
            />
            <p className="text-muted-foreground text-xs">
              Used in URLs and API paths. Contact support to change it.
            </p>
          </div>
          {canManage ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={save}
                disabled={!dirty || update.isPending}
                data-testid="org-general-save"
              >
                Save changes
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
