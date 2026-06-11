import { SectionHeader } from '../SettingsPanelShell.tsx';

/**
 * Members — placeholder panel (REPLACE_WITH_API).
 * Real build: mount shared MembersTable + InvitationsTable + InviteMemberDialog.
 * Escape hatch: promote to a real page under pages/organization/\$organizationId/
 * when it becomes a heavy admin surface; keep a hash → path redirect shim.
 */
export function OrganizationMembersPanel() {
  return (
    <section className="space-y-6" data-testid="settings-organization-members">
      <SectionHeader
        title="Members"
        description="People and invitations in this organization."
      />
      <p className="text-muted-foreground text-sm">
        This section is not wired to the backend yet.
      </p>
    </section>
  );
}
