import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';

import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog.tsx';

import type { SettingsSection } from './nav-items.ts';
import { AccountSection } from './sections/AccountSection.tsx';
import { AppearanceSection } from './sections/AppearanceSection.tsx';
import { NotificationsSection } from './sections/NotificationsSection.tsx';
import { OrgGeneralSection } from './sections/OrgGeneralSection.tsx';
import { ProfileSection } from './sections/ProfileSection.tsx';
import { SecuritySection } from './sections/SecuritySection.tsx';
import { isSettingsPath, pathForSection, sectionFromPath } from './settings-paths.ts';
import { SettingsNav } from './SettingsNav.tsx';

/**
 * Settings dialog — claude.ai-style modal driven by the URL.
 *
 * Open/closed is derived from `pathname.startsWith('/settings')`; the section
 * is derived from the rest of the path (e.g. `/settings/security` → security,
 * `/settings/organization/general` → org-general). Deep linking works out of
 * the box, the browser back button closes the dialog, and refresh keeps the
 * user on the same section.
 */
export function SettingsDialog() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();

  const open = isSettingsPath(pathname);
  const section = sectionFromPath(pathname);

  const close = () => {
    if (router.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: '/' });
    }
  };

  const goToSection = (next: SettingsSection) => {
    void navigate({ to: pathForSection(next) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="h-[640px] max-w-[1100px] gap-0 overflow-hidden p-0 sm:rounded-xl"
        data-testid="settings-dialog"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="grid h-full grid-cols-[260px_1fr]">
          <SettingsNav section={section} onSectionChange={goToSection} />
          <div className="overflow-y-auto px-8 py-6" data-testid="settings-content">
            <ActiveSection section={section} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActiveSection({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'profile':
      return <ProfileSection />;
    case 'account':
      return <AccountSection />;
    case 'security':
      return <SecuritySection />;
    case 'appearance':
      return <AppearanceSection />;
    case 'notifications':
      return <NotificationsSection />;
    case 'org-general':
      return <OrgGeneralSection />;
  }
}
