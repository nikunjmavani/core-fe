/**
 * In-memory mock store for TOTP MFA enrollment state. Demo-only
 * (REPLACE_WITH_API); reset between tests via {@link reset}. The secret +
 * recovery codes are fixed sample values — never real credentials.
 */
const SAMPLE_SECRET = 'JBSWY3DPEHPK3PXP';
const SAMPLE_RECOVERY_CODES = [
  '8H2K-9QXR',
  'P4M7-3VBL',
  'Z6CN-1TWD',
  'R9YG-5KFH',
  'M3QP-7XJS',
  'B8LV-2NRC',
];

let enabled = false;

export const mfaMockStore = {
  isEnabled(): boolean {
    return enabled;
  },
  begin(): { secret: string; otpauthUri: string } {
    return {
      secret: SAMPLE_SECRET,
      otpauthUri: `otpauth://totp/Core:you?secret=${SAMPLE_SECRET}&issuer=Core`,
    };
  },
  confirm(): { recoveryCodes: string[] } {
    enabled = true;
    return { recoveryCodes: [...SAMPLE_RECOVERY_CODES] };
  },
  disable(): void {
    enabled = false;
  },
  reset(): void {
    enabled = false;
  },
};
