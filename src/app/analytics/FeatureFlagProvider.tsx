import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { posthog } from '@/app/analytics/posthog.ts';

interface FeatureFlagContextValue {
  isFeatureEnabled: (flag: string) => boolean;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  isFeatureEnabled: () => false,
  isLoading: true,
});

/**
 * PostHog-backed feature flag provider.
 *
 * Wraps the app to provide feature flag state.
 * Gracefully degrades: if PostHog is not initialized, all flags return false.
 *
 * Usage:
 *   const { isFeatureEnabled } = useFeatureFlags();
 *   if (isFeatureEnabled('new-dashboard')) { ... }
 */
export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for PostHog to load feature flags, with a timeout fallback
    const timeout = setTimeout(() => setIsLoading(false), 3000);

    if (posthog.__loaded) {
      posthog.onFeatureFlags(() => setIsLoading(false));
    } else {
      // Defer setState to avoid synchronous setState in effect body
      queueMicrotask(() => setIsLoading(false));
    }

    return () => clearTimeout(timeout);
  }, []);

  const isFeatureEnabled = useCallback((flag: string): boolean => {
    try {
      return posthog.__loaded ? posthog.isFeatureEnabled(flag) === true : false;
    } catch {
      return false;
    }
  }, []);

  const contextValue = useMemo(
    () => ({ isFeatureEnabled, isLoading }),
    [isFeatureEnabled, isLoading],
  );

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/** Hook to access feature flags */
export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

/** Convenience hook for a single flag */
export function useFeatureFlag(flag: string): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(flag);
}
