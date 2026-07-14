import { useState } from 'react';

import { platformConfig } from '@/core/config/env.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { X } from '@/shared/icons/index.ts';

const DISMISS_KEY = 'test-mode-hint-dismissed';

/**
 * Dev-only nudge shown when `VITE_TEST_MODE` is OFF: a dismissible banner telling
 * you how to turn it on. Gated behind `debugLogging` (a named flag pinned OFF in
 * production), so it never renders in prod — no build-mode sniffing. Pairs with
 * the boot `console.info` in core/config/env.ts. Dismissal is per-session.
 */
export function TestModeHint() {
  const [dismissed, setDismissed] = useState(
    () => globalThis.sessionStorage?.getItem(DISMISS_KEY) === '1',
  );

  if (platformConfig.testMode || !platformConfig.debugLogging || dismissed) {
    return null;
  }

  const dismiss = () => {
    globalThis.sessionStorage?.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      role="note"
      data-testid="test-mode-hint"
      className="bg-muted text-muted-foreground border-border fixed bottom-3 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 text-xs"
    >
      <span>
        Test mode is <strong className="text-foreground">off</strong>. Set{' '}
        <code className="text-foreground">VITE_TEST_MODE=on</code> in{' '}
        <code className="text-foreground">.env.development</code> to enable devtools + E2E
        hooks.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={dismiss}
        aria-label="Dismiss test-mode hint"
        data-testid="test-mode-hint-dismiss"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
