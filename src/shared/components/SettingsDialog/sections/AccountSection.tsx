import { AccountSettings } from '@/shared/components/AccountSettings/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { SectionHeader } from './SectionHeader.tsx';

/**
 * Account section — read-only metadata + danger zone (deactivate / delete).
 * Reuses {@link AccountSettings} from `pages/settings/`.
 */
export function AccountSection() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6" data-testid="settings-section-account">
      <SectionHeader
        title="Account"
        description="Account metadata and irreversible actions."
      />
      <AccountSettings
        userId={user?.id ?? '—'}
        email={user?.email ?? '—'}
        role={user?.role ?? 'user'}
      />
    </div>
  );
}
