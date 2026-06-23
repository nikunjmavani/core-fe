import { useState } from 'react';

import type { ApiKey } from '@/shared/api/organization-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useApiKeys, useRevokeApiKey } from '@/shared/hooks/useApiKeys/index.ts';
import { Boxes, Trash2 } from '@/shared/icons/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
}

/**
 * Integrations panel — the active org's API keys. Lists keys (masked) with a
 * revoke action gated on an admin capability (`canManageRoles` — a personal org
 * has it `false`) and confirmed via the shared destructive-action dialog.
 * Covers loading / empty / error states. (Key creation with one-time-secret
 * reveal, and webhooks, are follow-ups behind a confirmed contract — FE-29.)
 */
export function OrganizationIntegrationsPanel() {
  const { data: keys, isLoading, isError } = useApiKeys();
  const canManage = useOrganizationStore((s) => s.capabilities?.canManageRoles ?? false);
  const revokeKey = useRevokeApiKey();
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);

  return (
    <section className="space-y-6" data-testid="settings-organization-integrations">
      <SectionHeader
        title="Integrations"
        description="API keys and connected services."
      />

      {isLoading ? (
        <div className="space-y-2" data-testid="apikeys-loading">
          {['a', 'b'].map((key) => (
            <Skeleton key={key} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          Couldn&apos;t load API keys. Please try again.
        </p>
      ) : null}

      {keys && keys.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No API keys"
          description="API keys let external services talk to your organization."
        />
      ) : null}

      {keys && keys.length > 0 ? (
        <ul
          className="divide-border bg-card divide-y rounded-lg border"
          data-testid="apikeys-list"
        >
          {keys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{key.name}</p>
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {key.prefix}•••••••• · added {formatDate(key.createdAt)}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Revoke ${key.name}`}
                  onClick={() => setToRevoke(key)}
                  data-testid={`apikey-revoke-${key.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={toRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setToRevoke(null);
        }}
        title={`Revoke ${toRevoke?.name ?? 'API key'}?`}
        description="Any service using this key will immediately lose access. This can't be undone."
        confirmLabel="Revoke"
        destructive
        onConfirm={async () => {
          if (toRevoke) await revokeKey.mutateAsync(toRevoke.id);
        }}
      />
    </section>
  );
}
