import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { copySensitiveText } from '@/lib/sensitive-clipboard.ts';
import type { MfaEnrollment } from '@/shared/api/mfa-api.ts';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog/index.ts';
import { QrCode } from '@/shared/components/QrCode/index.ts';
import { RecoveryCodesPanel } from '@/shared/components/RecoveryCodesPanel/index.ts';
import { SecurityOverviewCard } from '@/shared/components/SecurityOverviewCard/index.ts';
import {
  SETTINGS_KEYS,
  SETTINGS_NS,
} from '@/shared/components/SettingsModal/settings.constants.ts';
import { SectionHeader } from '@/shared/components/SettingsModal/SettingsPanelShell.tsx';
import { TotpCodeInput } from '@/shared/components/TotpCodeInput/index.ts';
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
import {
  usePasskeys,
  useRegisterPasskey,
  useRemovePasskey,
} from '@/shared/hooks/usePasskeys/index.ts';
import { Copy, Fingerprint, ShieldCheck, Trash2 } from '@/shared/icons/index.ts';
import { notify } from '@/shared/notify/index.ts';

/** Two-factor card: QR enroll → 6-digit OTP → recovery codes + disable. */
function MfaCard() {
  const { t } = useTranslation(SETTINGS_NS);
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
  const [secretCopied, setSecretCopied] = useState(false);

  function closeSetup() {
    setSetupOpen(false);
    setEnrollment(null);
    setCode('');
    setRecoveryCodes(null);
    setConfirmError(null);
    setSecretCopied(false);
  }

  function handleStartSetup() {
    setCode('');
    setConfirmError(null);
    setRecoveryCodes(null);
    setSecretCopied(false);
    begin
      .mutateAsync()
      .then((result) => {
        setEnrollment(result);
        setSetupOpen(true);
      })
      .catch(() => notify.error(t(SETTINGS_KEYS.security.mfa.errors.setupFailed)));
  }

  function handleSubmitCode(nextCode = code) {
    if (nextCode.length < 6) return;
    setConfirmError(null);
    confirm
      .mutateAsync(nextCode)
      .then((result) => setRecoveryCodes(result.recoveryCodes))
      .catch(() => setConfirmError(t(SETTINGS_KEYS.security.mfa.errors.invalidCode)));
  }

  async function handleCopySecret() {
    if (!enrollment?.secret) return;
    const ok = await copySensitiveText(enrollment.secret);
    if (ok) {
      setSecretCopied(true);
      window.setTimeout(() => setSecretCopied(false), 2000);
      notify.info(t(SETTINGS_KEYS.security.recoveryCodes.clipboardNotice));
    } else {
      notify.error(t(SETTINGS_KEYS.security.mfa.errors.setupFailed));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {t(SETTINGS_KEYS.security.mfa.title)}
            </CardTitle>
            <CardDescription>{t(SETTINGS_KEYS.security.mfa.description)}</CardDescription>
          </div>
          <Badge variant={mfaEnabled ? 'success' : 'secondary'} data-testid="mfa-status">
            {mfaEnabled
              ? t(SETTINGS_KEYS.security.mfa.enabled)
              : t(SETTINGS_KEYS.security.mfa.disabled)}
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
            {t(SETTINGS_KEYS.security.mfa.disable)}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleStartSetup}
            disabled={begin.isPending}
            data-testid="mfa-setup"
          >
            <ShieldCheck data-icon="inline-start" />
            {t(SETTINGS_KEYS.security.mfa.setup)}
          </Button>
        )}
      </CardContent>

      <Dialog
        open={setupOpen}
        onOpenChange={(open) => {
          if (!open) closeSetup();
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="mfa-setup-dialog">
          {recoveryCodes ? (
            <>
              <DialogHeader>
                <DialogTitle>{t(SETTINGS_KEYS.security.mfa.recoveryTitle)}</DialogTitle>
                <DialogDescription>
                  {t(SETTINGS_KEYS.security.mfa.recoveryDescription)}
                </DialogDescription>
              </DialogHeader>
              <RecoveryCodesPanel codes={recoveryCodes} onDone={closeSetup} />
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t(SETTINGS_KEYS.security.mfa.setupTitle)}</DialogTitle>
                <DialogDescription>
                  {t(SETTINGS_KEYS.security.mfa.setupDescription)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                {enrollment?.otpauthUri ? (
                  <div className="flex flex-col items-center gap-2">
                    <Card className="gap-0 py-0" data-testid="mfa-qr">
                      <CardContent className="flex size-44 items-center justify-center p-3">
                        <QrCode data={enrollment.otpauthUri} />
                      </CardContent>
                    </Card>
                    <p className="text-muted-foreground text-center text-xs">
                      {t(SETTINGS_KEYS.security.mfa.scanHint)}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mfa-secret">
                    {t(SETTINGS_KEYS.security.mfa.secretLabel)}
                  </Label>
                  <div className="flex gap-2">
                    <div
                      id="mfa-secret"
                      className="bg-muted flex-1 rounded-md p-3 font-mono text-sm break-all"
                      data-testid="mfa-secret"
                    >
                      {enrollment?.secret}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t(SETTINGS_KEYS.security.mfa.copySecret)}
                      onClick={() => void handleCopySecret()}
                      data-testid="mfa-copy-secret"
                    >
                      <Copy data-icon="inline-start" />
                    </Button>
                  </div>
                  {secretCopied ? (
                    <p className="text-success text-xs">
                      {t(SETTINGS_KEYS.security.mfa.copiedSecret)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="mfa-code">
                    {t(SETTINGS_KEYS.security.mfa.codeLabel)}
                  </Label>
                  <TotpCodeInput
                    id="mfa-code"
                    value={code}
                    onChange={setCode}
                    onComplete={handleSubmitCode}
                    invalid={!!confirmError}
                    testId="mfa-code"
                    aria-label={t(SETTINGS_KEYS.security.mfa.codeAria)}
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
                  {t(SETTINGS_KEYS.security.mfa.cancel)}
                </Button>
                <Button
                  onClick={() => handleSubmitCode()}
                  disabled={code.length < 6 || confirm.isPending}
                  data-testid="mfa-verify"
                >
                  {t(SETTINGS_KEYS.security.mfa.verifyEnable)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title={t(SETTINGS_KEYS.security.mfa.disableTitle)}
        description={t(SETTINGS_KEYS.security.mfa.disableDescription)}
        confirmLabel={t(SETTINGS_KEYS.security.mfa.disableConfirm)}
        destructive
        onConfirm={async () => {
          await disable.mutateAsync();
        }}
      />
    </Card>
  );
}

/** Passkeys card: list + named registration + revoke (FE-32). */
function PasskeysCard() {
  const { t } = useTranslation(SETTINGS_NS);
  const { data: passkeys = [] } = usePasskeys();
  const register = useRegisterPasskey();
  const remove = useRemovePasskey();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');

  function closeAdd() {
    setAddOpen(false);
    setName('');
  }

  function submitAdd() {
    register
      .mutateAsync(name.trim() || 'New passkey')
      .then(closeAdd)
      .catch(() => undefined);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t(SETTINGS_KEYS.security.passkeys.title)}
            </CardTitle>
            <CardDescription>
              {t(SETTINGS_KEYS.security.passkeys.description)}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            data-testid="add-passkey"
          >
            <Fingerprint data-icon="inline-start" />
            {t(SETTINGS_KEYS.security.passkeys.add)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm" data-testid="passkeys-empty">
            {t(SETTINGS_KEYS.security.passkeys.empty)}
          </p>
        ) : (
          passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
              data-testid="passkey-row"
            >
              <div className="flex items-center gap-2 text-sm">
                <Fingerprint className="text-muted-foreground" aria-hidden />
                {passkey.name}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t(SETTINGS_KEYS.security.passkeys.removeAria, {
                  name: passkey.name,
                })}
                onClick={() => remove.mutate(passkey.id)}
                disabled={remove.isPending}
                data-testid="passkey-remove"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) closeAdd();
        }}
      >
        <DialogContent data-testid="passkey-add-dialog">
          <DialogHeader>
            <DialogTitle>{t(SETTINGS_KEYS.security.passkeys.addTitle)}</DialogTitle>
            <DialogDescription>
              {t(SETTINGS_KEYS.security.passkeys.addDescription)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passkey-name">
              {t(SETTINGS_KEYS.security.passkeys.nameLabel)}
            </Label>
            <Input
              id="passkey-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t(SETTINGS_KEYS.security.passkeys.namePlaceholder)}
              data-testid="passkey-name"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeAdd}>
              {t(SETTINGS_KEYS.security.passkeys.cancel)}
            </Button>
            <Button
              onClick={submitAdd}
              disabled={register.isPending}
              data-testid="passkey-add-submit"
            >
              {t(SETTINGS_KEYS.security.passkeys.submit)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * Security section — two-factor authentication (real setup/disable flow, FE-32)
 * and passkeys (list / register / revoke, FE-32). Active sessions live in their
 * own panel (FE-31), so they are no longer duplicated here.
 */
export function AccountSecurityPanel() {
  const { t } = useTranslation(SETTINGS_NS);
  const { data: mfaEnabled = false } = useMfaStatus();
  const { data: passkeys = [] } = usePasskeys();

  return (
    <div className="flex flex-col gap-6" data-testid="settings-section-security">
      <SectionHeader
        title={t(SETTINGS_KEYS.security.heading)}
        description={t(SETTINGS_KEYS.security.description)}
      />

      <SecurityOverviewCard mfaEnabled={mfaEnabled} passkeyCount={passkeys.length} />

      <MfaCard />

      <PasskeysCard />
    </div>
  );
}
