import { useQuery } from '@tanstack/react-query';
import { type ChangeEvent, useRef, useState } from 'react';

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
import { useCan } from '@/shared/hooks/useCan/index.ts';
import { useUpdateOrganization } from '@/shared/hooks/useUpdateOrganization/index.ts';
import { notify } from '@/shared/notify/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { listMyOrganizations } from '@/shared/tenancy/my-organizations.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

/** Max logo size accepted by the (mock) uploader — keeps the data URL sane. */
const MAX_LOGO_BYTES = 1024 * 1024;

type UpdateMutation = ReturnType<typeof useUpdateOrganization>;

/**
 * Organization logo (FE-33) — preview + upload/remove. Mock mode stores a data
 * URL on the org; the live API takes a CDN URL (`logo_url`). Gated on the manage
 * capability; rejects non-images and oversized files before reading.
 */
function OrgLogoCard({
  logoUrl,
  name,
  canManage,
  update,
}: {
  logoUrl: string | null;
  name: string;
  canManage: boolean;
  update: UpdateMutation;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = (name || '?').charAt(0).toUpperCase();

  function onLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file after a failure
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      notify.error('Logo must be under 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') update.mutate({ logoUrl: reader.result });
    };
    reader.onerror = () => notify.error('Could not read that file.');
    reader.readAsDataURL(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logo</CardTitle>
        <CardDescription>
          Shown in the org switcher and on invites. Square images look best.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div
          className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          data-testid="org-logo-preview"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name || 'Organization'} logo`}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground text-xl font-semibold">{initial}</span>
          )}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoFile}
              data-testid="org-logo-input"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={update.isPending}
              data-testid="org-logo-upload"
            >
              Upload logo
            </Button>
            {logoUrl ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update.mutate({ logoUrl: null })}
                disabled={update.isPending}
                data-testid="org-logo-remove"
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Only organization admins can change the logo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Organization general settings — rename the active org (name-only; the slug
 * drives URLs and is read-only here) and manage its logo (FE-33). Gated on an
 * admin capability (`canManageMembers` — a personal org has it `false`). The
 * editable name is derived as a local draft over the server value (no
 * prop→state effect); saving updates via {@link useUpdateOrganization}.
 */
export function OrganizationGeneralPanel() {
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const organizationSlug = useOrganizationStore((s) => s.organizationSlug);
  const canManage = useCan({
    permission: 'membership:manage',
    teamOrganizationOnly: true,
  });
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

      <OrgLogoCard
        logoUrl={activeOrg?.logoUrl ?? null}
        name={activeOrg?.name ?? ''}
        canManage={canManage}
        update={update}
      />
    </div>
  );
}
