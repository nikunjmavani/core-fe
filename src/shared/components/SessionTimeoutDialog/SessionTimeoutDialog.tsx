import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { LAYOUT_KEYS, LAYOUT_NS } from '@/shared/layouts/layout.constants.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

/** Warn after 5 minutes idle, auto-logout after grace (90 s) */
const WARN_AFTER_MS = 5 * 60 * 1000;
const GRACE_MS = 90 * 1000;
const LOGOUT_AFTER_MS = WARN_AFTER_MS + GRACE_MS;
const GRACE_SECONDS = Math.round(GRACE_MS / 1000);

function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function SessionTimeoutDialog() {
  const { t } = useTranslation(LAYOUT_NS);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keys = LAYOUT_KEYS.app.sessionTimeout;

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
          <AlertDialogTitle>{t(keys.title)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(keys.description, { countdown: formatCountdown(countdown) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleSignOut} data-testid="session-signout">
            {t(keys.signOut)}
          </Button>
          <AlertDialogAction onClick={handleStaySignedIn} data-testid="session-stay">
            {t(keys.staySignedIn)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
