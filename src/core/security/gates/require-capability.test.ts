import { isNotFound, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { requireCapabilityGate } from './require-capability.ts';

/** Capture a synchronous throw for assertion. */
function thrownBy(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

const TEAM_CAPS = {
  canInviteMembers: true,
  canManageMembers: true,
  canManageRoles: true,
  canTransferOwnership: true,
  canDelete: true,
  canManageBilling: true,
};

beforeEach(() => {
  useOrganizationStore.getState().clearOrganization();
});

describe('requireCapabilityGate (L6)', () => {
  it('passes when the active org has the capability', () => {
    useOrganizationStore.setState({ capabilities: TEAM_CAPS });
    expect(() => requireCapabilityGate('canManageMembers')()).not.toThrow();
  });

  it('throws when the capability is false (e.g. a personal org)', () => {
    useOrganizationStore.setState({
      capabilities: { ...TEAM_CAPS, canManageMembers: false },
    });
    expect(() => requireCapabilityGate('canManageMembers')()).toThrow();
  });

  it('throws when there is no active-org capability set', () => {
    expect(() => requireCapabilityGate('canManageMembers')()).toThrow();
  });

  it('redirects to /unauthorized by default when denied (FE-52)', () => {
    expect(isRedirect(thrownBy(() => requireCapabilityGate('canManageMembers')()))).toBe(
      true,
    );
  });

  it('hides the surface as a 404 when onDeny is "notFound" (FE-52)', () => {
    useOrganizationStore.setState({
      capabilities: { ...TEAM_CAPS, canManageMembers: false },
    });
    expect(
      isNotFound(thrownBy(() => requireCapabilityGate('canManageMembers', 'notFound')())),
    ).toBe(true);
  });
});
