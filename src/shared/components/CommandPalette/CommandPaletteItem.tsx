import { Command } from 'cmdk';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

export function CommandItem({
  children,
  icon: Icon,
  onSelect,
  keywords,
  destructive = false,
}: {
  children: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  /** Extra terms cmdk matches the search query against (beyond the label). */
  keywords?: readonly string[];
  destructive?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      keywords={keywords ? [...keywords] : undefined}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors',
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
        destructive && 'text-destructive aria-selected:text-destructive',
      )}
      data-slot="menu-item"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Command.Item>
  );
}
