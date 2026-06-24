import type { Passkey } from './passkey-contracts.ts';

/**
 * In-memory passkey store (REPLACE_WITH_API) — session-persistent like the other
 * mock stores. Real registration runs the WebAuthn ceremony
 * (`navigator.credentials.create()` against a server challenge); the mock just
 * records a named credential so the management UI is exercisable.
 */
let counter = 1;

const passkeys: Passkey[] = [
  {
    id: 'pk_seed',
    name: 'MacBook Touch ID',
    createdAt: '2026-02-10T10:00:00.000Z',
    lastUsedAt: '2026-06-20T08:30:00.000Z',
  },
];

export const passkeyMockStore = {
  list(): Passkey[] {
    return passkeys.map((passkey) => ({ ...passkey }));
  },
  add(name: string): Passkey {
    counter += 1;
    const passkey: Passkey = {
      id: `pk_${counter}`,
      name: name.trim() || `Passkey ${counter}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    passkeys.push(passkey);
    return { ...passkey };
  },
  remove(id: string): void {
    const index = passkeys.findIndex((passkey) => passkey.id === id);
    if (index >= 0) passkeys.splice(index, 1);
  },
  resetForTests(): void {
    passkeys.length = 0;
    passkeys.push({
      id: 'pk_seed',
      name: 'MacBook Touch ID',
      createdAt: '2026-02-10T10:00:00.000Z',
      lastUsedAt: '2026-06-20T08:30:00.000Z',
    });
    counter = 1;
  },
};
