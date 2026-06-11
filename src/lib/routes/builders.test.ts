import { describe, expect, it } from 'vitest';

import {
  organizationDashboard,
  organizationPicker,
  organizationSuspended,
} from './builders.ts';

describe('route builders', () => {
  it('return {to, params} objects consumable by typed Link/navigate', () => {
    expect(organizationPicker()).toEqual({ to: '/organization' });
    expect(organizationDashboard('org_8fK2x')).toEqual({
      to: '/organization/$organizationId/dashboard',
      params: { organizationId: 'org_8fK2x' },
    });
    expect(organizationSuspended('org_8fK2x')).toEqual({
      to: '/organization/$organizationId/suspended',
      params: { organizationId: 'org_8fK2x' },
    });
  });
});
