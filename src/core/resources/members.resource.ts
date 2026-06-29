import { z } from 'zod';

import type { Resource } from './types.ts';

/** Reference member record shape — REPLACE_WITH_API when members island lands. */
export const memberSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  status: z.enum(['active', 'invited', 'suspended']),
});

/** Reference resource manifest for the members CRUD surface (L7 registry). */
export const membersResource: Resource<typeof memberSchema> = {
  name: 'members',
  schema: memberSchema,
  permissions: {
    list: 'membership:read',
    show: 'membership:read',
    create: 'membership:manage',
    update: 'membership:manage',
    delete: 'membership:manage',
  },
  ui: { label: 'Members', icon: 'Users', showInNav: true },
};
