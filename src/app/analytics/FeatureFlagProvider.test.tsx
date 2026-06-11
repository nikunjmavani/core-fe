import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/analytics/posthog.ts', () => ({
  posthog: {
    __loaded: false,
    onFeatureFlags: vi.fn(),
    isFeatureEnabled: vi.fn().mockReturnValue(false),
  },
}));

import {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
} from './FeatureFlagProvider.tsx';

function TestConsumer() {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  const flag = useFeatureFlag('test-flag');
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="enabled">{String(isFeatureEnabled('test-flag'))}</span>
      <span data-testid="hook-flag">{String(flag)}</span>
    </div>
  );
}

describe('FeatureFlagProvider', () => {
  it('renders children', () => {
    render(
      <FeatureFlagProvider>
        <span>child</span>
      </FeatureFlagProvider>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('provides isFeatureEnabled that returns false when PostHog not loaded', async () => {
    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    expect(screen.getByTestId('enabled').textContent).toBe('false');
  });

  it('provides useFeatureFlag hook', () => {
    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    expect(screen.getByTestId('hook-flag').textContent).toBe('false');
  });
});

describe('useFeatureFlags without provider', () => {
  it('returns default context values', () => {
    function Naked() {
      const { isFeatureEnabled, isLoading } = useFeatureFlags();
      return (
        <div>
          <span data-testid="default-loading">{String(isLoading)}</span>
          <span data-testid="default-flag">{String(isFeatureEnabled('x'))}</span>
        </div>
      );
    }

    render(<Naked />);
    expect(screen.getByTestId('default-loading').textContent).toBe('true');
    expect(screen.getByTestId('default-flag').textContent).toBe('false');
  });
});
