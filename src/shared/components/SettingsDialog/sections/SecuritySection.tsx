import { SecuritySettings } from '@/shared/components/SecuritySettings/index.ts';

import { SectionHeader } from './SectionHeader.tsx';

/**
 * Security section — MFA, passkeys, active sessions.
 * Reuses {@link SecuritySettings} from `pages/settings/`.
 */
export function SecuritySection() {
  return (
    <div className="space-y-6" data-testid="settings-section-security">
      <SectionHeader
        title="Security"
        description="Two-factor authentication, passkeys, and active sessions."
      />
      <SecuritySettings />
    </div>
  );
}
