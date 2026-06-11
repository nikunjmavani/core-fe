import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

interface Tab {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  /** When set, each tab gets `data-testid="${testIdPrefix}-${tab.id}"`. */
  testIdPrefix?: string;
}

/**
 * Tab bar with a static active-tab underline. The sliding (framer-motion)
 * indicator was intentionally removed for a calmer, no-motion UI. Full ARIA
 * tablist semantics and keyboard navigation are preserved.
 */
export function AnimatedTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  testIdPrefix,
}: AnimatedTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      // eslint-disable-next-line security/detect-object-injection -- nextIndex from keyboard nav, bounded
      const tab = tabs[nextIndex] ?? null;
      if (tab) {
        onTabChange(tab.id);
        const children = e.currentTarget.parentElement?.children;
        // eslint-disable-next-line security/detect-object-injection -- nextIndex bounded by tabs.length
        const target = children ? Array.from(children)[nextIndex] : undefined;
        (target as HTMLElement | undefined)?.focus();
      }
    }
  };

  return (
    <div
      className={cn('border-border flex gap-1 border-b', className)}
      role="tablist"
      aria-orientation="horizontal"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="text-muted-foreground hover:text-foreground relative px-4 py-2 text-sm font-medium transition-colors"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          role="tab"
          tabIndex={activeTab === tab.id ? 0 : -1}
          id={`tab-${tab.id}`}
          {...(testIdPrefix ? { 'data-testid': `${testIdPrefix}-${tab.id}` } : {})}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Generic wrapper kept for API stability. Shared layout animations were
 * removed; this now renders its children directly.
 */
export function AnimatedLayoutGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
