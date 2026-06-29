import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signInWithPasskey } from './passkey-sign-in.ts';

describe('signInWithPasskey', () => {
  const getMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('PublicKeyCredential', class PublicKeyCredential {});
    vi.stubGlobal('navigator', {
      credentials: { get: getMock },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when passkey login is not wired to the backend yet', async () => {
    getMock.mockResolvedValue({ id: 'pk_mock' });

    await expect(signInWithPasskey()).rejects.toMatchObject({
      code: 'AUTH_PASSKEY_CANCELLED',
      message: 'Passkey sign-in requires a configured backend.',
    });
    expect(getMock).toHaveBeenCalledOnce();
  });

  it('throws when the passkey prompt is dismissed', async () => {
    getMock.mockResolvedValue(null);

    await expect(signInWithPasskey()).rejects.toMatchObject({
      code: 'AUTH_PASSKEY_CANCELLED',
    });
  });
});
