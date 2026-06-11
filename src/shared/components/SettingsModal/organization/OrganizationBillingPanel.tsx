import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Billing — placeholder panel (REPLACE_WITH_API).
 * Escape hatch: promote to a real page under pages/organization/\$organizationId/
 * when it becomes a heavy admin surface; keep a hash → path redirect shim.
 */
export function OrganizationBillingPanel() {
  return (
    <section className="space-y-6" data-testid="settings-organization-billing">
      <SectionHeader title="Billing" description="Plan, subscription, and invoices." />
      <p className="text-muted-foreground text-sm">
        This section is not wired to the backend yet.
      </p>
    </section>
  );
}
