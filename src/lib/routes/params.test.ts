import { describe, expect, it } from 'vitest';

import { parseOrganizationIdParam } from './params.ts';

describe('parseOrganizationIdParam', () => {
  it('accepts well-formed public organization ids', () => {
    expect(parseOrganizationIdParam('org_8fK2x')).toBe('org_8fK2x');
    expect(parseOrganizationIdParam('org_acme')).toBe('org_acme');
  });

  it.each([
    '',
    'org_',
    '8fK2x',
    'pat_8fK2x',
    'org_with-hyphen',
    'org_…',
    `org_${'a'.repeat(33)}`,
  ])('rejects %j with null (guard turns this into a 404)', (raw) => {
    expect(parseOrganizationIdParam(raw)).toBeNull();
  });
});
