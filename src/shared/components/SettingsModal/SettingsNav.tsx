import { Search } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';
import { Input } from '@/shared/components/ui/input.tsx';

import type { SettingsNavGroup, SettingsSectionRef } from './settings-sections.ts';
import { filterNav } from './settings-sections.ts';

interface SettingsNavProps {
  /** Groups already filtered by context + permission (parent owns gating). */
  groups: readonly SettingsNavGroup[];
  active: SettingsSectionRef;
  onSelect: (next: SettingsSectionRef) => void;
}

/**
 * Left rail of the settings modal — search box + grouped section list.
 * Controlled component: parent owns the active section (sourced from the hash).
 */
export function SettingsNav({ groups, active, onSelect }: SettingsNavProps) {
  const [query, setQuery] = useState('');
  const visible = filterNav(groups, query);

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
        {visible.length === 0 && (
          <p
            className="text-muted-foreground px-2 py-4 text-center text-xs"
            data-testid="settings-nav-empty"
          >
            No matches
          </p>
        )}
        {visible.map((group) => (
          <div key={group.scope}>
            <p className="text-muted-foreground mb-1.5 px-2 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.scope === active.scope && item.section === active.section;
                return (
                  <li key={`${item.scope}/${item.section}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`settings-nav-${item.scope}-${item.section}`}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
