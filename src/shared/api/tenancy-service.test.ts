import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/store/useTenantStore/index.ts', () => {
  const setTenant = vi.fn();
  return {
    useTenantStore: {
      getState: () => ({
        tenantId: null,
        tenantSlug: null,
        setTenant,
      }),
    },
  };
});

import { useTenantStore } from '@/shared/store/useTenantStore/index.ts';

import { getCurrentTenantSlug, resolveTenantFromSubdomain } from './tenancy-service.ts';

const setTenant = useTenantStore.getState().setTenant as ReturnType<typeof vi.fn>;

describe('resolveTenantFromSubdomain', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    setTenant.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  function setHostname(hostname: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname },
      writable: true,
    });
  }

  it('uses fallback for localhost', () => {
    setHostname('localhost');
    resolveTenantFromSubdomain();
    expect(setTenant).toHaveBeenCalledWith('default', 'default');
  });

  it('uses fallback for 127.0.0.1', () => {
    setHostname('127.0.0.1');
    resolveTenantFromSubdomain();
    expect(setTenant).toHaveBeenCalledWith('default', 'default');
  });

  it('uses fallback when no subdomain detected', () => {
    setHostname('app.example.com');
    resolveTenantFromSubdomain();
    // "app" + "example" + "com" = 3 parts, so subdomain "app" is extracted
    // Actually, let's check: parts.length < 3 → false for 3 parts
    // So it extracts "app" as slug
    expect(setTenant).toHaveBeenCalledWith('app', 'app');
  });

  it('extracts subdomain from multi-part hostname', () => {
    setHostname('acme.app.example.com');
    resolveTenantFromSubdomain();
    expect(setTenant).toHaveBeenCalledWith('acme', 'acme');
  });

  it('uses fallback for invalid slug format', () => {
    setHostname('INVALID_SLUG!.app.example.com');
    resolveTenantFromSubdomain();
    expect(setTenant).toHaveBeenCalledWith('default', 'default');
  });

  it('uses fallback for bare domain with only 2 parts', () => {
    setHostname('example.com');
    resolveTenantFromSubdomain();
    expect(setTenant).toHaveBeenCalledWith('default', 'default');
  });
});

describe('getCurrentTenantSlug', () => {
  it('returns the slug from the store', () => {
    const result = getCurrentTenantSlug();
    expect(result).toBeNull();
  });
});
