import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import {
  SETTINGS_KEYS,
  SETTINGS_NS,
} from '@/shared/components/SettingsModal/settings.constants.ts';
import { SectionHeader } from '@/shared/components/SettingsModal/SettingsPanelShell.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog.tsx';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Separator } from '@/shared/components/ui/separator.tsx';
import { Copy, ShieldCheck, Trash2, TriangleAlert } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

/**
 * Account section — read-only account metadata plus a destructive "danger
 * zone" for deactivating or deleting the account, each gated behind a confirm
 * dialog.
 *
 * Deferred to the FE↔BE integration epic. core-be exposes `GET /users/me` and
 * `DELETE /users/me`, but there is NO `deactivate` endpoint — the danger-zone
 * actions need either a real deactivate route or a decision to map "deactivate"
 * onto delete before they can be wired to a mutation here.
 */
export function AccountPanel() {
  const { t } = useTranslation(SETTINGS_NS);
  const accountPanels = SETTINGS_KEYS.panels.account;
  const user = useAuthStore((s) => s.user);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const userId = user?.id ?? '—';
  const email = user?.email ?? '—';
  const role = user?.role ?? 'user';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      notify.success(i18n.t(ERRORS_KEYS.frontend.account.copySuccess, { ns: ERRORS_NS }));
    } catch {
      notify.error(i18n.t(ERRORS_KEYS.frontend.account.copyFailed, { ns: ERRORS_NS }));
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-section-account">
      <SectionHeader
        title="Account"
        description="Account metadata and irreversible actions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account information</CardTitle>
          <CardDescription>Details about your account.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="Account ID">
            <span className="flex items-center gap-2">
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{userId}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy account ID"
                onClick={() => void copyId()}
                data-testid="account-copy-id"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </span>
          </InfoRow>
          <InfoRow label="Email">{email}</InfoRow>
          <InfoRow label="Role">
            <Badge variant="secondary" className="capitalize">
              {role}
            </Badge>
          </InfoRow>
          <InfoRow label="Email verified">
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          </InfoRow>
        </CardContent>
      </Card>

      <Card className="border-destructive/40" data-testid="danger-zone">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2 text-base">
            <TriangleAlert className="h-4 w-4" /> Danger zone
          </CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Deactivate account</p>
              <p className="text-muted-foreground text-sm">
                Temporarily disable your account. You can reactivate by signing in again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                notify.success(
                  i18n.t(ERRORS_KEYS.frontend.account.accountDeactivatedPending, {
                    ns: ERRORS_NS,
                  }),
                )
              }
              data-testid="account-deactivate"
            >
              Deactivate
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              data-testid="account-delete"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(accountPanels.deleteTitle)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(accountPanels.deleteDescription)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="account-delete-cancel">
              {t(accountPanels.deleteCancel)}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                setConfirmDelete(false);
                notify.success(
                  i18n.t(ERRORS_KEYS.frontend.account.accountDeletionPending, {
                    ns: ERRORS_NS,
                  }),
                );
              }}
              data-testid="account-delete-confirm"
            >
              {t(accountPanels.deleteConfirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
