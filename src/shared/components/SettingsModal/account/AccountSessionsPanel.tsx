import { useState } from 'react';

import type { Session } from '@/shared/api/session-contracts.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useRevokeSession, useSessions } from '@/shared/hooks/useSessions/index.ts';
import { Laptop, LogOut } from '@/shared/icons/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

function lastActive(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
}

/**
 * Sessions panel — devices currently signed in. The current session is badged
 * and can't be revoked; any other session can be signed out (confirmed via the
 * shared destructive-action dialog). Covers loading / error states.
 */
export function AccountSessionsPanel() {
  const { data: sessions, isLoading, isError } = useSessions();
  const revoke = useRevokeSession();
  const [toRevoke, setToRevoke] = useState<Session | null>(null);

  return (
    <section className="space-y-6" data-testid="settings-account-sessions">
      <SectionHeader
        title="Sessions"
        description="Devices currently signed in to your account."
      />

      {isLoading ? (
        <div className="space-y-2" data-testid="sessions-loading">
          {['a', 'b'].map((key) => (
            <Skeleton key={key} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          Couldn&apos;t load your sessions. Please try again.
        </p>
      ) : null}

      {sessions && sessions.length > 0 ? (
        <ul
          className="divide-border bg-card divide-y rounded-lg border"
          data-testid="sessions-list"
        >
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-3 p-3">
              <Laptop className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{session.device}</p>
                  {session.current ? (
                    <Badge variant="secondary">This device</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {session.browser} · {session.location} · active{' '}
                  {lastActive(session.lastActiveAt)}
                </p>
              </div>
              {session.current ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToRevoke(session)}
                  data-testid={`session-revoke-${session.id}`}
                >
                  <LogOut className="mr-1.5 size-4" aria-hidden />
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={toRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setToRevoke(null);
        }}
        title="Sign out this session?"
        description={`${toRevoke?.device ?? 'This device'} will be signed out immediately.`}
        confirmLabel="Sign out"
        destructive
        onConfirm={async () => {
          if (toRevoke) await revoke.mutateAsync(toRevoke.id);
        }}
      />
    </section>
  );
}
