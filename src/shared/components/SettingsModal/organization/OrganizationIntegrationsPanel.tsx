import { useState } from 'react';

import type { ApiKey } from '@/shared/api/organization-contracts.ts';
import {
  createWebhookSchema,
  type Webhook,
  WEBHOOK_EVENTS,
} from '@/shared/api/webhook-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { EmptyState } from '@/shared/components/EmptyState/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useApiKeys, useRevokeApiKey } from '@/shared/hooks/useApiKeys/index.ts';
import {
  useCreateWebhook,
  useDeleteWebhook,
  useWebhooks,
} from '@/shared/hooks/useWebhooks/index.ts';
import { Boxes, Plus, Trash2 } from '@/shared/icons/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
}

function useCanManageIntegrations(): boolean {
  return useOrganizationStore((s) => s.capabilities?.canManageRoles ?? false);
}

/** API keys — list (masked) + cap-gated revoke. */
function ApiKeysSection() {
  const { data: keys, isLoading, isError } = useApiKeys();
  const canManage = useCanManageIntegrations();
  const revokeKey = useRevokeApiKey();
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">API keys</h3>
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
    </div>
  );
}

/** Webhooks — list + cap-gated create (url + events) + delete. */
function WebhooksSection() {
  const { data: hooks, isLoading } = useWebhooks();
  const canManage = useCanManageIntegrations();
  const create = useCreateWebhook();
  const remove = useDeleteWebhook();
  const [toDelete, setToDelete] = useState<Webhook | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  function submit() {
    const parsed = createWebhookSchema.safeParse({ url, events });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: () => {
        setAddOpen(false);
        setUrl('');
        setEvents([]);
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Webhooks</h3>
        {canManage ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            data-testid="webhook-add"
          >
            <Plus className="mr-1.5 size-4" />
            Add webhook
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-lg" data-testid="webhooks-loading" />
      ) : null}

      {hooks && hooks.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No webhooks"
          description="Send organization events to an external URL."
        />
      ) : null}

      {hooks && hooks.length > 0 ? (
        <ul
          className="divide-border bg-card divide-y rounded-lg border"
          data-testid="webhooks-list"
        >
          {hooks.map((hook) => (
            <li key={hook.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm">{hook.url}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {hook.events.join(', ')}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete webhook ${hook.url}`}
                  onClick={() => setToDelete(hook)}
                  data-testid={`webhook-delete-${hook.id}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-testid="webhook-add-dialog">
          <DialogHeader>
            <DialogTitle>Add a webhook</DialogTitle>
            <DialogDescription>
              We&apos;ll POST the selected events to this URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Payload URL</Label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/hooks"
                data-testid="webhook-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <Button
                    key={event}
                    type="button"
                    size="sm"
                    variant={events.includes(event) ? 'default' : 'outline'}
                    onClick={() => toggleEvent(event)}
                    data-testid={`webhook-event-${event}`}
                  >
                    {event}
                  </Button>
                ))}
              </div>
            </div>
            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={create.isPending}
              data-testid="webhook-create"
            >
              Create webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Delete this webhook?"
        description="Events will stop being delivered to this URL. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (toDelete) await remove.mutateAsync(toDelete.id);
        }}
      />
    </div>
  );
}

/**
 * Integrations panel — API keys (revoke) + outbound webhooks (create/delete),
 * both gated on an admin capability (`canManageRoles` — false in a personal
 * org). API-key creation with one-time-secret reveal remains a follow-up.
 */
export function OrganizationIntegrationsPanel() {
  return (
    <section className="space-y-8" data-testid="settings-organization-integrations">
      <SectionHeader title="Integrations" description="API keys and webhooks." />
      <ApiKeysSection />
      <WebhooksSection />
    </section>
  );
}
