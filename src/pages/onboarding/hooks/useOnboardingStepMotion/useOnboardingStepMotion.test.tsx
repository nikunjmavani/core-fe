import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OnboardingStep } from '@/shared/store/useOnboardingStore/index.ts';

const { animateMock, createTimelineMock } = vi.hoisted(() => ({
  animateMock: vi.fn(() => ({ pause: vi.fn() })),
  createTimelineMock: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    pause: vi.fn(),
  })),
}));

vi.mock('animejs', () => ({
  animate: animateMock,
  createTimeline: createTimelineMock,
  cubicBezier: () => (t: number) => t,
}));

import { useOnboardingStepMotion } from './useOnboardingStepMotion.ts';

function MotionHarness({ index, step }: { index: number; step: OnboardingStep }) {
  const { cardRef, headerRef, stepBodyRef } = useOnboardingStepMotion(index, step);
  return (
    <div>
      <div ref={cardRef} data-testid="card" />
      <div ref={headerRef} data-testid="header" />
      <div ref={stepBodyRef} data-testid="body" />
    </div>
  );
}

describe('useOnboardingStepMotion', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('plays card entrance and step timeline when motion is allowed', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { rerender, unmount } = render(
      <StrictMode>
        <MotionHarness index={0} step="welcome" />
      </StrictMode>,
    );
    expect(animateMock).toHaveBeenCalledTimes(1);
    expect(createTimelineMock).not.toHaveBeenCalled();

    rerender(
      <StrictMode>
        <MotionHarness index={1} step="profile" />
      </StrictMode>,
    );
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(createTimelineMock).toHaveBeenCalledTimes(1);
    const stepProps =
      createTimelineMock.mock.results[0]?.value?.add?.mock?.calls?.[0]?.[1];
    expect(stepProps).toMatchObject({
      translateY: expect.any(Array),
      opacity: expect.any(Array),
      scale: expect.any(Array),
    });
    expect(stepProps).not.toHaveProperty('translateX');

    unmount();
  });

  it('skips anime when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    render(<MotionHarness index={0} step="welcome" />);
    expect(animateMock).not.toHaveBeenCalled();
    expect(createTimelineMock).not.toHaveBeenCalled();
  });
});
