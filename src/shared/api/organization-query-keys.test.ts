import { describe, expect, it } from 'vitest';

import { orgQueryKeys } from './organization-query-keys.ts';

describe('orgQueryKeys', () => {
  it('namespaces every resource key under the organization root', () => {
    const resourceKeys = [
      orgQueryKeys.members(),
      orgQueryKeys.invitations(),
      orgQueryKeys.roles(),
      orgQueryKeys.apiKeys(),
      orgQueryKeys.subscription(),
    ];
    for (const key of resourceKeys) {
      expect(key[0]).toBe(orgQueryKeys.all[0]);
    }
  });

  it('keeps resource keys distinct (no cache collisions)', () => {
    const serialized = [
      orgQueryKeys.members(),
      orgQueryKeys.invitations(),
      orgQueryKeys.roles(),
      orgQueryKeys.apiKeys(),
      orgQueryKeys.subscription(),
    ].map((k) => JSON.stringify(k));
    expect(new Set(serialized).size).toBe(serialized.length);
  });
});
