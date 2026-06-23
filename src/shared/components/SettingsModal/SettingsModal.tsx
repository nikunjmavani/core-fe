import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { ORGANIZATION } from '@/core/config/constants.ts';
import { organizationPicker } from '@/lib/routes/index.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog.tsx';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import { Building2 } from '@/shared/icons/index.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import type { OrganizationType } from '@/shared/tenancy/me-context.ts';

import { AccountAppearancePanel } from './account/AccountAppearancePanel.tsx';
import { AccountNotificationsPanel } from './account/AccountNotificationsPanel.tsx';
import { AccountPanel } from './account/AccountPanel.tsx';
import { AccountProfilePanel } from './account/AccountProfilePanel.tsx';
import { AccountSecurityPanel } from './account/AccountSecurityPanel.tsx';
import { AccountSessionsPanel } from './account/AccountSessionsPanel.tsx';
import { OrganizationBillingPanel } from './organization/OrganizationBillingPanel.tsx';
import { OrganizationBranchesPanel } from './organization/OrganizationBranchesPanel.tsx';
import { OrganizationGeneralPanel } from './organization/OrganizationGeneralPanel.tsx';
import { OrganizationIntegrationsPanel } from './organization/OrganizationIntegrationsPanel.tsx';
import { OrganizationMembersPanel } from './organization/OrganizationMembersPanel.tsx';
import { OrganizationRolesPanel } from './organization/OrganizationRolesPanel.tsx';
import { parseSettingsHash, settingsHash } from './settings-hash.ts';
import { canViewSettingsSection } from './settings-permissions.ts';
import type {
  OrganizationSettingsSection,
  SettingsSectionRef,
} from './settings-sections.ts';
import { sectionsForOrgType, SETTINGS_NAV } from './settings-sections.ts';
import { SettingsNav } from './SettingsNav.tsx';

/**
 * Global settings modal — ONE modal for account + organization settings,
 * driven by the URL hash (`#settings/<scope>/<section>`), mounted once on the
 * root route so it overlays any page without unmounting it. Deep links
 * reproduce page + modal, refresh keeps the section, back/Esc closes.
 *
 * Route guards never see hashes: auth, organization-context, and permission
 * gating all happen here (settings-permissions.ts). routing-and-tenancy.md §7.
 */
export function SettingsModal() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const organizationId = useOrganizationStore((s) => s.organizationId);
  const permissions = useOrganizationStore((s) => s.permissions);
  // Active org type (PERSONAL/TEAM) drives which org sections exist. Undefined
  // while me/context loads → fall back to permission-only gating.
  const orgType = useMeContext().data?.activeOrganization?.type;
  const navigate = useNavigate();
  const router = useRouter();

  const active = isAuthenticated ? parseSettingsHash(hash) : null;
  const scope = active?.scope;
  const section = active?.section;

  // Hash changes are invisible to pageview analytics — emit explicitly.
  useEffect(() => {
    if (scope && section) {
      // Lazy: posthog loads at idle (main.tsx); resolve from the module cache
      // instead of pulling the chunk into this component's static graph.
      import('posthog-js')
        .then(({ default: posthog }) => {
          if (posthog.__loaded) {
            posthog.capture('settings_section_viewed', { scope, section });
          }
        })
        .catch(() => {
          /* analytics must never break settings */
        });
    }
  }, [scope, section]);

  if (!active) return null;

  const hasOrganizationContext =
    !!organizationId && organizationId !== ORGANIZATION.LOCALHOST_FALLBACK;
  const ctx = { role: user?.role ?? ('user' as const), permissions };

  const allowedForOrgType = (section: OrganizationSettingsSection) =>
    !orgType || sectionsForOrgType(orgType).includes(section);

  const visibleGroups = SETTINGS_NAV.map((group) =>
    group.scope === 'organization'
      ? {
          ...group,
          items: group.items.filter(
            (item) =>
              hasOrganizationContext &&
              canViewSettingsSection(item, ctx) &&
              allowedForOrgType(item.section as OrganizationSettingsSection),
          ),
        }
      : group,
  ).filter((group) => group.items.length > 0);

  const close = () => {
    if (router.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: '.', hash: '', replace: true });
    }
  };

  // Section switches replace the history entry so a single Back closes the
  // modal from anywhere instead of replaying every visited section.
  const goTo = (next: SettingsSectionRef) => {
    void navigate({
      to: '.',
      hash: settingsHash(next.scope, next.section),
      replace: true,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="h-[640px] max-w-[1100px] gap-0 overflow-hidden p-0 sm:rounded-xl"
        data-testid="settings-modal"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="grid h-full grid-cols-[260px_1fr]">
          <SettingsNav groups={visibleGroups} active={active} onSelect={goTo} />
          <div className="overflow-y-auto px-8 py-6" data-testid="settings-content">
            <ActivePanel
              active={active}
              hasOrganizationContext={hasOrganizationContext}
              orgType={orgType}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivePanel({
  active,
  hasOrganizationContext,
  orgType,
}: {
  active: SettingsSectionRef;
  hasOrganizationContext: boolean;
  orgType: OrganizationType | undefined;
}) {
  if (active.scope === 'organization' && !hasOrganizationContext) {
    return <SelectOrganizationFirst />;
  }
  if (
    active.scope === 'organization' &&
    orgType &&
    !sectionsForOrgType(orgType).includes(active.section as OrganizationSettingsSection)
  ) {
    return <SectionNotAvailable />;
  }
  switch (active.section) {
    case 'profile':
      return <AccountProfilePanel />;
    case 'account':
      return <AccountPanel />;
    case 'security':
      return <AccountSecurityPanel />;
    case 'notifications':
      return <AccountNotificationsPanel />;
    case 'appearance':
      return <AccountAppearancePanel />;
    case 'sessions':
      return <AccountSessionsPanel />;
    case 'general':
      return <OrganizationGeneralPanel />;
    case 'members':
      return <OrganizationMembersPanel />;
    case 'roles':
      return <OrganizationRolesPanel />;
    case 'branches':
      return <OrganizationBranchesPanel />;
    case 'billing':
      return <OrganizationBillingPanel />;
    case 'integrations':
      return <OrganizationIntegrationsPanel />;
  }
}

/** Organization settings opened with no organization context. */
function SelectOrganizationFirst() {
  const navigate = useNavigate();
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 text-center"
      data-testid="settings-select-organization"
    >
      <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
        <Building2 className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Select an organization first</h2>
        <p className="text-muted-foreground max-w-xs text-sm">
          Organization settings apply to a specific organization — pick one to continue.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => void navigate({ ...organizationPicker(), hash: '' })}
        data-testid="settings-go-to-picker"
      >
        Select organization
      </Button>
    </div>
  );
}

/** An org section that isn't available for this organization's type (e.g. a
 * personal org has no Members/Roles). Reached only via a stale deep link. */
function SectionNotAvailable() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 text-center"
      data-testid="settings-section-unavailable"
    >
      <h2 className="text-base font-semibold">Not available here</h2>
      <p className="text-muted-foreground max-w-xs text-sm">
        This section isn't available for a personal organization. Create or switch to a
        team to manage it.
      </p>
    </div>
  );
}
