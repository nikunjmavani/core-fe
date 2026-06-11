import { orgPermissionSchema } from './permissions.ts';

describe('orgPermissionSchema', () => {
  it('parses a known permission code', () => {
    expect(orgPermissionSchema.parse('membership:read')).toBe('membership:read');
  });

  it('rejects an unknown permission code', () => {
    expect(() => orgPermissionSchema.parse('not:a-permission')).toThrow();
  });
});
