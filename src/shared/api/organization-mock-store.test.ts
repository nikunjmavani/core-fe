import { beforeEach, describe, expect, it } from 'vitest';

import { orgMockStore } from './organization-mock-store.ts';

describe('orgMockStore', () => {
  beforeEach(() => {
    orgMockStore.reset();
  });

  describe('members', () => {
    it('updates a member role', () => {
      const [first] = orgMockStore.listMembers();
      const updated = orgMockStore.updateMemberRole(first!.id, 'viewer');
      expect(updated.role).toBe('viewer');
      expect(orgMockStore.listMembers().find((m) => m.id === first!.id)?.role).toBe(
        'viewer',
      );
    });

    it('suspends and reactivates a member', () => {
      const [first] = orgMockStore.listMembers();
      expect(orgMockStore.updateMemberStatus(first!.id, 'suspended').status).toBe(
        'suspended',
      );
      expect(orgMockStore.updateMemberStatus(first!.id, 'active').status).toBe('active');
    });

    it('removes a member', () => {
      const before = orgMockStore.listMembers().length;
      const [first] = orgMockStore.listMembers();
      orgMockStore.removeMember(first!.id);
      expect(orgMockStore.listMembers()).toHaveLength(before - 1);
      expect(orgMockStore.listMembers().some((m) => m.id === first!.id)).toBe(false);
    });

    it('throws when updating an unknown member', () => {
      expect(() => orgMockStore.updateMemberRole('nope', 'admin')).toThrow();
    });
  });

  describe('invitations', () => {
    it('adds an invitation to the front of the list', () => {
      const invitation = {
        id: 'inv_new',
        email: 'new@acme.test',
        role: 'member' as const,
        status: 'pending' as const,
        invitedByName: 'You',
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      };
      orgMockStore.addInvitation(invitation);
      expect(orgMockStore.listInvitations()[0]?.id).toBe('inv_new');
    });

    it('revokes an invitation', () => {
      const [first] = orgMockStore.listInvitations();
      expect(orgMockStore.revokeInvitation(first!.id).status).toBe('revoked');
    });

    it('resends an invitation (back to pending with fresh expiry)', () => {
      const expired = orgMockStore.listInvitations().find((i) => i.status === 'expired');
      const result = orgMockStore.resendInvitation(expired!.id);
      expect(result.status).toBe('pending');
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('roles', () => {
    it('recomputes system role member counts from live members', () => {
      const owners = orgMockStore.listMembers().filter((m) => m.role === 'owner').length;
      const ownerRole = orgMockStore.listRoles().find((r) => r.name === 'Owner');
      expect(ownerRole?.memberCount).toBe(owners);
    });

    it('creates, updates, and deletes a custom role', () => {
      const created = orgMockStore.addRole({
        id: 'role_custom',
        name: 'Billing manager',
        description: 'Manages billing',
        permissions: ['subscription:manage'],
        memberCount: 0,
        isSystem: false,
      });
      expect(orgMockStore.listRoles().some((r) => r.id === created.id)).toBe(true);

      orgMockStore.updateRole('role_custom', { name: 'Billing admin' });
      expect(orgMockStore.listRoles().find((r) => r.id === 'role_custom')?.name).toBe(
        'Billing admin',
      );

      orgMockStore.deleteRole('role_custom');
      expect(orgMockStore.listRoles().some((r) => r.id === 'role_custom')).toBe(false);
    });
  });

  describe('api keys', () => {
    it('adds, renames, and removes an API key', () => {
      orgMockStore.addApiKey({
        id: 'key_new',
        name: 'Temp',
        prefix: 'core_live_aaaa',
        createdAt: new Date().toISOString(),
      });
      expect(orgMockStore.listApiKeys()[0]?.id).toBe('key_new');

      orgMockStore.renameApiKey('key_new', 'Renamed');
      expect(orgMockStore.listApiKeys().find((k) => k.id === 'key_new')?.name).toBe(
        'Renamed',
      );

      orgMockStore.removeApiKey('key_new');
      expect(orgMockStore.listApiKeys().some((k) => k.id === 'key_new')).toBe(false);
    });
  });

  describe('subscription', () => {
    it('updates the subscription', () => {
      const updated = orgMockStore.updateSubscription({ plan: 'starter', seats: 50 });
      expect(updated.plan).toBe('starter');
      expect(orgMockStore.getSubscription().seats).toBe(50);
    });
  });

  it('reset restores the seed data', () => {
    const [first] = orgMockStore.listMembers();
    orgMockStore.removeMember(first!.id);
    orgMockStore.reset();
    expect(orgMockStore.listMembers().some((m) => m.id === first!.id)).toBe(true);
  });
});
