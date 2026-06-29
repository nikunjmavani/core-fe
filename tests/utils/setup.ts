import '@testing-library/jest-dom/vitest';
import '@/lib/i18n/i18n.ts';

import { beforeAll, expect } from 'vitest';
import * as matchers from 'vitest-axe/matchers';

import { ensureLocale } from '@/lib/i18n/load-namespace.ts';

expect.extend(matchers);

beforeAll(async () => {
  await ensureLocale('en');
});

// jsdom does not implement matchMedia — required by useThemeStore
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom does not implement ResizeObserver — required by some Radix primitives
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom does not implement IntersectionObserver — required by embla-carousel
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

// input-otp uses elementFromPoint for focus management — stub in jsdom.
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}
