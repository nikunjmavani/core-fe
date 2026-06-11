import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Roles — placeholder panel (REPLACE_WITH_API).
 * Escape hatch: promote to a real page under pages/organization/\$organizationId/
 * when it becomes a heavy admin surface; keep a hash → path redirect shim.
 */
export function OrganizationRolesPanel() {
  return (
    <section className="space-y-6" data-testid="settings-organization-roles">
      <SectionHeader
        title="Roles"
        description="Roles and their permissions in this organization."
      />
      <p className="text-muted-foreground text-sm">
        This section is not wired to the backend yet.
      </p>
    </section>
  );
}
