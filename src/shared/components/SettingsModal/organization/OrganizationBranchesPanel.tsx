import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Branches — placeholder panel. Deferred to the FE↔BE integration epic: core-be
 * exposes no organization-branches resource yet, so there is nothing to list or
 * mutate. Wiring needs a `/tenancy/organization/branches` CRUD surface first.
 * Escape hatch: promote to a real page under pages/organization/\$organizationSlug/
 * when it becomes a heavy admin surface; keep a hash → path redirect shim.
 */
export function OrganizationBranchesPanel() {
  return (
    <section className="space-y-6" data-testid="settings-organization-branches">
      <SectionHeader
        title="Branches"
        description="Locations / sites of this organization."
      />
      <p className="text-muted-foreground text-sm">
        This section is not wired to the backend yet.
      </p>
    </section>
  );
}
