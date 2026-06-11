import { Search } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';
import { Input } from '@/shared/components/ui/input.tsx';

import { filterNav, SETTINGS_NAV, type SettingsSection } from './nav-items.ts';

interface SettingsNavProps {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

/**
 * Left rail of the Settings dialog — search box + grouped section list.
 * Controlled component: parent owns the active `section` (sourced from URL).
 */
export function SettingsNav({ section, onSectionChange }: SettingsNavProps) {
  const [query, setQuery] = useState('');
  const groups = filterNav(SETTINGS_NAV, query);

  return (
    <aside
      aria-label="Settings sections"
      data-testid="settings-nav"
      className="bg-muted/30 flex h-full flex-col border-r"
    >
      <div className="p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-background h-9 pl-8"
            aria-label="Search settings"
            data-testid="settings-search"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3" aria-label="Settings">
        {groups.length === 0 && (
          <p
            className="text-muted-foreground px-2 py-4 text-center text-xs"
            data-testid="settings-nav-empty"
          >
            No matches
          </p>
        )}
        {groups.map((group) => (
          <div key={group.id}>
            <p className="text-muted-foreground mb-1.5 px-2 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemRow
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  Icon={item.icon}
                  active={section === item.id}
                  onClick={() => onSectionChange(item.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

interface NavItemRowProps {
  id: SettingsSection;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}

function NavItemRow({ id, label, Icon, active, onClick }: NavItemRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        data-testid={`settings-nav-${id}`}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          'focus-visible:ring-ring outline-none focus-visible:ring-2',
          active
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}
