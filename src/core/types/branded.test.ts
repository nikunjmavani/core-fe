import { OrgId, TenantId, UserId } from './branded.ts';

describe('branded types', () => {
  it('UserId("abc") returns "abc" at runtime', () => {
    expect(UserId('abc')).toBe('abc');
  });

  it('TenantId("xyz") returns "xyz" at runtime', () => {
    expect(TenantId('xyz')).toBe('xyz');
  });

  it('OrgId("123") returns "123" at runtime', () => {
    expect(OrgId('123')).toBe('123');
  });

  it('factory functions return the input string', () => {
    const id = 'user-123';
    expect(UserId(id)).toBe(id);
  });
});
