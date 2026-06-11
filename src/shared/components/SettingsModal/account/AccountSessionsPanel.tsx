import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Active sessions — placeholder panel (REPLACE_WITH_API: list + revoke
 * sessions from the auth service).
 */
export function AccountSessionsPanel() {
  return (
    <section className="space-y-6" data-testid="settings-account-sessions">
      <SectionHeader
        title="Sessions"
        description="Devices currently signed in to your account."
      />
      <p className="text-muted-foreground text-sm">
        This section is not wired to the backend yet.
      </p>
    </section>
  );
}
