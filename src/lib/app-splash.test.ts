import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dismissAppSplash,
  isAppSplashActive,
  onAppSplashDismissed,
} from './app-splash.ts';

describe('app-splash', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    const splash = document.createElement('div');
    splash.id = 'app-splash';
    splash.textContent = 'Loading';
    document.body.append(splash, document.createElement('div'));
    document.body.lastElementChild!.id = 'root';
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('isAppSplashActive reflects the boot overlay', () => {
    expect(isAppSplashActive()).toBe(true);
    document.getElementById('app-splash')?.remove();
    expect(isAppSplashActive()).toBe(false);
  });

  it('dismissAppSplash adds exit class and removes the node', () => {
    vi.useFakeTimers();
    dismissAppSplash();
    expect(
      document.getElementById('app-splash')?.classList.contains('app-splash-exiting'),
    ).toBe(true);
    vi.advanceTimersByTime(480);
    expect(document.getElementById('app-splash')).toBeNull();
  });

  it('onAppSplashDismissed fires immediately when splash is already gone', () => {
    document.getElementById('app-splash')?.remove();
    const spy = vi.fn();
    onAppSplashDismissed(spy);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('onAppSplashDismissed fires after dismissAppSplash', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    onAppSplashDismissed(spy);
    dismissAppSplash();
    vi.advanceTimersByTime(480);
    expect(spy).toHaveBeenCalledOnce();
  });
});
