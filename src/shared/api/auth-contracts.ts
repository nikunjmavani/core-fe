import { z } from 'zod';

import { AUTH_KEYS } from '@/shared/auth/auth-shell.constants.ts';

const v = AUTH_KEYS.validation;

/** Email/password login — retained for MFA handoff tests and legacy API surface. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, v.emailRequired).pipe(z.email(v.invalidEmail)),
  password: z.string().min(1, v.passwordRequired).min(8, v.passwordMinLength),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z
  .object({
    code: z.string().trim().min(1, v.codeRequired),
    useRecoveryCode: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!(val.useRecoveryCode || /^\d{6}$/.test(val.code))) {
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: v.mfaTotpFormat,
      });
    }
  });

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const emailVerificationCodeSchema = z.object({
  email: z.string().trim().min(1, v.emailRequired).pipe(z.email(v.invalidEmail)),
  code: z
    .string()
    .trim()
    .min(1, v.codeRequired)
    .length(6, v.emailVerificationCodeLength)
    .regex(/^[A-Za-z0-9]+$/, v.emailVerificationCodeLength),
});

export type EmailVerificationCodeInput = z.infer<typeof emailVerificationCodeSchema>;
