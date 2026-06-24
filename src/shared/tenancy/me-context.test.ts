import { describe, expect, it } from 'vitest';

import { type MeContextWire, meContextWire, toMeContext } from './me-context.ts';

const ORG_ID = 'org_abcdefghij0123456789x'; // 21-char lowercase suffix
const PERSONAL_ID = 'org_personalij0123456789x';
const USER_ID = 'usr_abcdefghij0123456789x';

const WIRE: MeContextWire = {
  user: {
    id: USER_ID,
    email: 'ada@acme.test',
    is_email_verified: true,
    is_mfa_enabled: false,
    first_name: 'Ada',
    last_name: null,
    avatar_url: null,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  },
  active_organization: {
    id: ORG_ID,
    name: 'Acme',
    slug: 'acme',
    type: 'TEAM',
    status: 'ACTIVE',
    logo_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  // core-be #795: no capabilities object — gating uses these permissions + org type.
  my_permissions: ['organization:read', 'membership:manage', 'subscription:manage'],
  global_role: null,
  organizations: [
    {
      id: ORG_ID,
      name: 'Acme',
      slug: 'acme',
      type: 'TEAM',
      status: 'ACTIVE',
      logo_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_active: true,
    },
    {
      id: PERSONAL_ID,
      name: 'Personal',
      slug: null,
      type: 'PERSONAL',
      status: 'ACTIVE',
      logo_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_active: false,
    },
  ],
};

describe('meContextWire', () => {
  it('parses a valid wire payload', () => {
    expect(meContextWire.safeParse(WIRE).success).toBe(true);
  });

  it('accepts a null active organization', () => {
    expect(meContextWire.safeParse({ ...WIRE, active_organization: null }).success).toBe(
      true,
    );
  });

  it('rejects a malformed org id', () => {
    const bad = {
      ...WIRE,
      active_organization: { ...WIRE.active_organization, id: 'org_BAD' },
    };
    expect(meContextWire.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown global_role', () => {
    expect(meContextWire.safeParse({ ...WIRE, global_role: 'wizard' }).success).toBe(
      false,
    );
  });
});

describe('toMeContext', () => {
  it('maps snake_case wire to the camelCase domain shape', () => {
    const ctx = toMeContext(WIRE);
    expect(ctx.user.isEmailVerified).toBe(true);
    expect(ctx.user.firstName).toBe('Ada');
    expect(ctx.user.lastName).toBeNull();
    expect(ctx.activeOrganization?.type).toBe('TEAM');
    expect(ctx.myPermissions).toContain('organization:read');
    expect(ctx.globalRole).toBeNull();
  });

  it('flags the active org; personal orgs keep a null slug', () => {
    const ctx = toMeContext(WIRE);
    expect(ctx.organizations).toHaveLength(2);
    const active = ctx.organizations.find((o) => o.isActive);
    const personal = ctx.organizations.find((o) => o.type === 'PERSONAL');
    expect(active?.id).toBe(ORG_ID);
    expect(personal?.isActive).toBe(false);
    expect(personal?.slug).toBeNull();
  });

  it('maps a null active organization to null', () => {
    expect(
      toMeContext({ ...WIRE, active_organization: null }).activeOrganization,
    ).toBeNull();
  });
});
