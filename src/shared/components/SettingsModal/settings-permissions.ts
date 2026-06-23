import type { AccessContext, OrganizationPermission } from '@/core/rbac/policies.ts';
import { hasPermission } from '@/core/rbac/policies.ts';

import type {
  OrganizationSettingsSection,
  SettingsSectionRef,
} from './settings-sections.ts';

/**
 * Permission gating for settings sections. Route guards never see hash state,
 * so the modal enforces RBAC itself — reusing `core/rbac` policies, never
 * forking them. Account sections need only a signed-in user.
 */
const ORGANIZATION_SECTION_PERMISSION: Record<
  OrganizationSettingsSection,
  OrganizationPermission
> = {
  general: 'organization:read',
  members: 'membership:read',
  roles: 'role:read',
  branches: 'organization:read',
  // Any member can SEE billing (personal orgs included — see sectionsForOrgType);
  // managing a subscription is capability-gated inside the panel.
  billing: 'organization:read',
  integrations: 'webhook:read',
};

export function canViewSettingsSection(
  ref: SettingsSectionRef,
  ctx: AccessContext,
): boolean {
  if (ref.scope === 'account') return true;
  return hasPermission(
    ctx,
    ORGANIZATION_SECTION_PERMISSION[ref.section as OrganizationSettingsSection],
  );
}
