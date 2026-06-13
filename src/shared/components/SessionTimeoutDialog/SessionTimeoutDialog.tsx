import { useCallback, useEffect, useRef, useState } from 'react';

import { startIdleTimeout } from '@/shared/auth/idle-timeout.ts';
import { forceLogout } from '@/shared/auth/service.ts';
import { startSessionLifetimeWatch } from '@/shared/auth/session-lifetime.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

/** Warn after 5 minutes idle, auto-logout after grace (90 s) */
const WARN_AFTER_MS = 5 * 60 * 1000;
const GRACE_MS = 90 * 1000;
const LOGOUT_AFTER_MS = WARN_AFTER_MS + GRACE_MS;
const GRACE_SECONDS = Math.round(GRACE_MS / 1000);

export function SessionTimeoutDialog() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(GRACE_SECONDS);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = startIdleTimeout({
      warnAfterMs: WARN_AFTER_MS,
      logoutAfterMs: LOGOUT_AFTER_MS,
      onWarn: () => {
        setOpen(true);
        startCountdown();
      },
      onLogout: () => {
        stopCountdown();
        setOpen(false);
        forceLogout();
      },
      onActive: () => {
        stopCountdown();
        setOpen(false);
      },
    });

    // Absolute lifetime cap — fires regardless of activity (the idle timer
    // above only covers *inactivity*). A long-lived session kept warm by the
    // proactive refresh is force-logged-out once it exceeds SESSION.MAX_AGE_MS.
    const stopLifetimeWatch = startSessionLifetimeWatch(() => {
      stopCountdown();
      setOpen(false);
      forceLogout();
    });

    return () => {
      cleanup();
      stopLifetimeWatch();
      stopCountdown();
    };
  }, [isAuthenticated, startCountdown, stopCountdown]);

  const handleStaySignedIn = () => {
    stopCountdown();
    setOpen(false);
    // Activity will be detected via mouse/keyboard, resetting the idle timer
  };

  const handleSignOut = () => {
    stopCountdown();
    setOpen(false);
    forceLogout();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="session-timeout-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Session expiring</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in{' '}
            <span className="font-semibold tabular-nums" data-testid="session-countdown">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </span>{' '}
            due to inactivity. Click &ldquo;Stay signed in&rdquo; to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleSignOut} data-testid="session-signout">
            Sign out
          </Button>
          <AlertDialogAction onClick={handleStaySignedIn} data-testid="session-stay">
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
