import { describe, expect, it } from 'vitest';

import { type MeContextWire, meContextWire, toMeContext } from './me-context.ts';

const ORG_ID = 'org_abcdefghij0123456789x'; // 21-char lowercase suffix
const PERSONAL_ID = 'org_personalij0123456789x';
const USER_ID = 'usr_abcdefghij0123456789x';

const teamCaps = {
  can_invite_members: true,
  can_manage_members: true,
  can_manage_roles: true,
  can_transfer_ownership: true,
  can_delete: true,
  can_manage_billing: true,
};
const personalCaps = {
  can_invite_members: false,
  can_manage_members: false,
  can_manage_roles: false,
  can_transfer_ownership: false,
  can_delete: false,
  can_manage_billing: false,
};

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
    capabilities: teamCaps,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  my_permissions: ['organization:read', 'membership:manage'],
  global_role: null,
  organizations: [
    {
      id: ORG_ID,
      name: 'Acme',
      slug: 'acme',
      type: 'TEAM',
      status: 'ACTIVE',
      logo_url: null,
      capabilities: teamCaps,
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
      capabilities: personalCaps,
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
    expect(ctx.activeOrganization?.capabilities.canManageBilling).toBe(true);
    expect(ctx.myPermissions).toContain('organization:read');
    expect(ctx.globalRole).toBeNull();
  });

  it('flags the active org and exposes personal-vs-team capabilities', () => {
    const ctx = toMeContext(WIRE);
    expect(ctx.organizations).toHaveLength(2);
    const active = ctx.organizations.find((o) => o.isActive);
    const personal = ctx.organizations.find((o) => o.type === 'PERSONAL');
    expect(active?.id).toBe(ORG_ID);
    expect(personal?.isActive).toBe(false);
    expect(personal?.slug).toBeNull();
    expect(personal?.capabilities.canManageBilling).toBe(false);
  });

  it('maps a null active organization to null', () => {
    expect(
      toMeContext({ ...WIRE, active_organization: null }).activeOrganization,
    ).toBeNull();
  });

  it('tolerates an older backend whose capabilities omit can_manage_billing', () => {
    // Live core-be (pre-#788) returns only 5 capability flags — verified by curl
    // against http://localhost:3000. The schema defaults the missing flag to false.
    const legacyCaps = {
      can_invite_members: true,
      can_manage_members: true,
      can_manage_roles: true,
      can_transfer_ownership: true,
      can_delete: true,
    };
    const legacy = {
      ...WIRE,
      active_organization: { ...WIRE.active_organization, capabilities: legacyCaps },
    };
    const parsed = meContextWire.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(
        toMeContext(parsed.data).activeOrganization?.capabilities.canManageBilling,
      ).toBe(false);
    }
  });
});
