import { useState } from 'react';

import type { MfaEnrollment } from '@/shared/api/mfa-api.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
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
import {
  useBeginMfaEnrollment,
  useConfirmMfaEnrollment,
  useDisableMfa,
  useMfaStatus,
} from '@/shared/hooks/useMfa/index.ts';
import { Fingerprint, ShieldCheck, Trash2 } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

// REPLACE_WITH_API: GET /auth/me/passkeys (WebAuthn registration is a follow-up).
const PASSKEYS = [
  { id: 'p1', name: 'MacBook Touch ID', createdAt: '2026-02-10T10:00:00.000Z' },
];

/** Two-factor card: real setup (secret → code → recovery codes) + disable. */
function MfaCard() {
  const { data: mfaEnabled = false } = useMfaStatus();
  const begin = useBeginMfaEnrollment();
  const confirm = useConfirmMfaEnrollment();
  const disable = useDisableMfa();

  const [setupOpen, setSetupOpen] = useState(false);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  function closeSetup() {
    setSetupOpen(false);
    setEnrollment(null);
    setCode('');
    setRecoveryCodes(null);
    setConfirmError(null);
  }

  function handleStartSetup() {
    setCode('');
    setConfirmError(null);
    setRecoveryCodes(null);
    begin
      .mutateAsync()
      .then((result) => {
        setEnrollment(result);
        setSetupOpen(true);
      })
      .catch(() => notify.error('Could not start setup. Please try again.'));
  }

  function handleSubmitCode() {
    setConfirmError(null);
    confirm
      .mutateAsync(code)
      .then((result) => setRecoveryCodes(result.recoveryCodes))
      .catch(() =>
        setConfirmError('That code didn’t match. Enter the current 6-digit code.'),
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Two-factor authentication</CardTitle>
            <CardDescription>Require an authenticator code at sign-in.</CardDescription>
          </div>
          <Badge variant={mfaEnabled ? 'success' : 'secondary'} data-testid="mfa-status">
            {mfaEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {mfaEnabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisableOpen(true)}
            data-testid="mfa-disable"
          >
            Disable two-factor
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleStartSetup}
            disabled={begin.isPending}
            data-testid="mfa-setup"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Set up two-factor
          </Button>
        )}
      </CardContent>

      <Dialog
        open={setupOpen}
        onOpenChange={(open) => {
          if (!open) closeSetup();
        }}
      >
        <DialogContent data-testid="mfa-setup-dialog">
          {recoveryCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your recovery codes</DialogTitle>
                <DialogDescription>
                  Store these somewhere safe. Each one works once if you lose your device.
                </DialogDescription>
              </DialogHeader>
              <ul
                className="bg-muted grid grid-cols-2 gap-2 rounded-md p-3 font-mono text-sm"
                data-testid="mfa-recovery-codes"
              >
                {recoveryCodes.map((rc) => (
                  <li key={rc}>{rc}</li>
                ))}
              </ul>
              <DialogFooter>
                <Button onClick={closeSetup} data-testid="mfa-done">
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Set up two-factor authentication</DialogTitle>
                <DialogDescription>
                  Add this secret to your authenticator app, then enter the 6-digit code.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div
                  className="bg-muted rounded-md p-3 font-mono text-sm break-all"
                  data-testid="mfa-secret"
                >
                  {enrollment?.secret}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-code">6-digit code</Label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    data-testid="mfa-code"
                  />
                  {confirmError ? (
                    <p className="text-destructive text-xs" role="alert">
                      {confirmError}
                    </p>
                  ) : null}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeSetup}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitCode}
                  disabled={code.length < 6 || confirm.isPending}
                  data-testid="mfa-verify"
                >
                  Verify &amp; enable
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="Disable two-factor authentication?"
        description="Your account will be less protected. You can turn it back on anytime."
        confirmLabel="Disable"
        destructive
        onConfirm={async () => {
          await disable.mutateAsync();
        }}
      />
    </Card>
  );
}

/**
 * Security section — two-factor authentication (real setup/disable flow, FE-32)
 * and passkeys. Active sessions live in their own panel (FE-31), so they are no
 * longer duplicated here.
 */
export function AccountSecurityPanel() {
  return (
    <div className="space-y-6" data-testid="settings-section-security">
      <SectionHeader
        title="Security"
        description="Two-factor authentication and passkeys."
      />

      <MfaCard />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Passkeys</CardTitle>
              <CardDescription>
                Sign in without a password using your device.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => notify.success('Passkey registration started (mock)')}
              data-testid="add-passkey"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Add passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {PASSKEYS.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <Fingerprint className="text-muted-foreground h-4 w-4" />
                {pk.name}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${pk.name}`}
                onClick={() => notify.success('Passkey removed (mock)')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
