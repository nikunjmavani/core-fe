import { useMemo, useState } from 'react';

import {
  computeProfileCompleteness,
  type ProfileInput,
} from '@/shared/forms/ProfileForm/contracts.ts';
import { ProfileForm } from '@/shared/forms/ProfileForm/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Profile section — name, job title, bio, location, timezone.
 * Reuses {@link ProfileForm} from `pages/settings/` so there's one source of truth.
 */
export function AccountProfilePanel() {
  const user = useAuthStore((s) => s.user);
  const [values, setValues] = useState<ProfileInput>({
    name: user?.name ?? '',
    jobTitle: '',
    bio: '',
    location: '',
    timezone: '',
  });
  const completeness = useMemo(() => computeProfileCompleteness(values), [values]);

  return (
    <div className="space-y-6" data-testid="settings-section-profile">
      <SectionHeader
        title="Profile"
        description="How you appear in the app. Visible to people in your organization."
        meta={`Profile ${completeness}% complete`}
      />
      <ProfileForm
        email={user?.email ?? ''}
        defaultValues={values}
        onValuesChange={setValues}
      />
    </div>
  );
}
