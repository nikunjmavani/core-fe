import { describe, expect, it, vi } from 'vitest';

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onFCP: vi.fn(),
  onTTFB: vi.fn(),
}));

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import { initPerformanceMonitoring } from './performance.ts';

describe('initPerformanceMonitoring', () => {
  it('registers all Web Vitals callbacks', () => {
    initPerformanceMonitoring();

    expect(onCLS).toHaveBeenCalledOnce();
    expect(onINP).toHaveBeenCalledOnce();
    expect(onLCP).toHaveBeenCalledOnce();
    expect(onFCP).toHaveBeenCalledOnce();
    expect(onTTFB).toHaveBeenCalledOnce();
  });

  it('passes a function callback to each metric', () => {
    initPerformanceMonitoring();

    expect(typeof vi.mocked(onCLS).mock.calls[0]?.[0]).toBe('function');
    expect(typeof vi.mocked(onINP).mock.calls[0]?.[0]).toBe('function');
    expect(typeof vi.mocked(onLCP).mock.calls[0]?.[0]).toBe('function');
  });
});
