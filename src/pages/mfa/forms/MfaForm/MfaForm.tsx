import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { translateFormMessage } from '@/lib/i18n/translate-form-message.ts';
import { authApi } from '@/shared/api/auth-api.ts';
import { type MfaVerifyInput, mfaVerifySchema } from '@/shared/api/auth-contracts.ts';
import { clearMfaHandoff, readMfaHandoff } from '@/shared/auth/mfa-handoff.ts';
import { safeRedirect } from '@/shared/auth/redirect-safety.ts';
import { establishSession } from '@/shared/auth/service.ts';
import { TotpCodeInput } from '@/shared/components/TotpCodeInput/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { mapFrontendError } from '@/shared/errors/map-frontend-error.ts';
import { FormError } from '@/shared/forms/FormError/index.ts';

import {
  AUTH_KEYS,
  AUTH_MFA_RECOVERY_MAX_LENGTH,
  AUTH_NS,
  MFA_TEST_IDS,
} from '../../mfa.constants.ts';

type LocationState = { mfaToken?: string; redirect?: string };

export function MfaForm() {
  const { t } = useTranslation(AUTH_NS);
  const [apiError, setApiError] = useState<string | null>(null);
  const [otpShake, setOtpShake] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | undefined;
  const handoff = readMfaHandoff();
  const mfaToken = state?.mfaToken ?? handoff.mfaSessionToken;
  const redirectTarget = state?.redirect ?? handoff.redirect;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MfaVerifyInput>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { code: '', useRecoveryCode: false },
  });
  const useRecovery = watch('useRecoveryCode') ?? false;

  const onSubmit = async (data: MfaVerifyInput) => {
    setApiError(null);
    if (!mfaToken) {
      setApiError(t(AUTH_KEYS.mfa.errors.sessionExpired));
      return;
    }
    try {
      const { accessToken } = await authApi.mfaVerify(data, mfaToken);
      clearMfaHandoff();
      await establishSession(accessToken);
      void navigate({ to: safeRedirect(redirectTarget) ?? '/', replace: true });
    } catch (err) {
      if (!useRecovery) {
        setValue('code', '');
        setOtpShake(true);
        window.setTimeout(() => setOtpShake(false), 450);
      }
      setApiError(mapFrontendError(err));
    }
  };

  if (!mfaToken) {
    return (
      <div className="flex flex-col gap-6" data-testid={MFA_TEST_IDS.form}>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(AUTH_KEYS.mfa.sessionExpiredHeading)}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t(AUTH_KEYS.mfa.sessionExpiredSubheading)}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">{t(AUTH_KEYS.common.signIn)}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid={MFA_TEST_IDS.form}>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(AUTH_KEYS.mfa.heading)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {useRecovery
            ? t(AUTH_KEYS.mfa.recoveryHint)
            : t(AUTH_KEYS.mfa.authenticatorHint)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <FormError message={apiError} data-testid={MFA_TEST_IDS.formError} />

          <div className="flex flex-col gap-2">
            {useRecovery ? (
              <>
                <Label htmlFor="mfa-code">{t(AUTH_KEYS.mfa.recoveryCodeLabel)}</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  placeholder={t(AUTH_KEYS.mfa.recoveryPlaceholder)}
                  maxLength={AUTH_MFA_RECOVERY_MAX_LENGTH}
                  aria-invalid={!!errors.code}
                  aria-describedby={errors.code ? 'mfa-code-error' : undefined}
                  data-testid={MFA_TEST_IDS.code}
                  {...register('code')}
                />
              </>
            ) : (
              <>
                <Label htmlFor="mfa-code">{t(AUTH_KEYS.mfa.codeLabel)}</Label>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <TotpCodeInput
                      id="mfa-code"
                      value={field.value}
                      onChange={field.onChange}
                      onComplete={() => {
                        handleSubmit(onSubmit)().catch(() => {
                          /* onSubmit maps its own errors to form state */
                        });
                      }}
                      invalid={!!errors.code || !!apiError}
                      shake={otpShake}
                      testId={MFA_TEST_IDS.code}
                      aria-label={t(AUTH_KEYS.mfa.codeLabel)}
                    />
                  )}
                />
              </>
            )}
            {errors.code ? (
              <p id="mfa-code-error" className="text-destructive text-xs" role="alert">
                {translateFormMessage(errors.code.message)}
              </p>
            ) : null}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid={MFA_TEST_IDS.submit}
            >
              {isSubmitting ? t(AUTH_KEYS.mfa.verifying) : t(AUTH_KEYS.mfa.submit)}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setValue('useRecoveryCode', !useRecovery);
                setValue('code', '', { shouldValidate: false });
                setApiError(null);
              }}
              data-testid={MFA_TEST_IDS.toggleRecovery}
            >
              {useRecovery
                ? t(AUTH_KEYS.mfa.useAuthenticator)
                : t(AUTH_KEYS.mfa.useRecovery)}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
