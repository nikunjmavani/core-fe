import type { NavigateFn } from '@tanstack/react-router';
import { Command } from 'cmdk';

import { Building2, Check } from '@/shared/icons/index.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';

import { CommandItem } from './CommandPaletteItem.tsx';

interface CommandPaletteOrgGroupProps {
  meContext: MeContext;
  heading: string;
  currentOrganizationLabel: (name: string) => string;
  switchOrganizationLabel: (name: string) => string;
  runCommand: (command: () => void) => void;
  navigate: NavigateFn;
}

/** Organization switcher entries for the command palette. */
export function CommandPaletteOrgGroup({
  meContext,
  heading,
  currentOrganizationLabel,
  switchOrganizationLabel,
  runCommand,
  navigate,
}: CommandPaletteOrgGroupProps) {
  if (meContext.organizations.length <= 1) return null;

  return (
    <>
      <Command.Separator className="bg-border my-1 h-px" />
      <Command.Group
        heading={heading}
        className="text-muted-foreground px-1 py-1.5 text-xs font-medium"
      >
        {meContext.organizations
          .filter((org) => org.slug)
          .map((org) => (
            <CommandItem
              key={org.id}
              onSelect={() =>
                runCommand(() => {
                  if (org.isActive || !org.slug) return;
                  void navigate({
                    to: '/organization/$organizationSlug/dashboard',
                    params: { organizationSlug: org.slug },
                  });
                })
              }
              icon={org.isActive ? Check : Building2}
            >
              {org.isActive
                ? currentOrganizationLabel(org.name)
                : switchOrganizationLabel(org.name)}
            </CommandItem>
          ))}
      </Command.Group>
    </>
  );
}
