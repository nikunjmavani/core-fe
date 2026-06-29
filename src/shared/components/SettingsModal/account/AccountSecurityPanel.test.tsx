import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

const {
  useMfaStatusMock,
  beginMutateAsync,
  confirmMutateAsync,
  disableMutateAsync,
  usePasskeysMock,
  registerMutateAsync,
  removePasskeyMutate,
} = vi.hoisted(() => ({
  useMfaStatusMock: vi.fn(),
  beginMutateAsync: vi.fn(),
  confirmMutateAsync: vi.fn(),
  disableMutateAsync: vi.fn(),
  usePasskeysMock: vi.fn(),
  registerMutateAsync: vi.fn(),
  removePasskeyMutate: vi.fn(),
}));
vi.mock('@/shared/hooks/useMfa/index.ts', () => ({
  useMfaStatus: useMfaStatusMock,
  useBeginMfaEnrollment: () => ({ mutateAsync: beginMutateAsync, isPending: false }),
  useConfirmMfaEnrollment: () => ({ mutateAsync: confirmMutateAsync, isPending: false }),
  useDisableMfa: () => ({ mutateAsync: disableMutateAsync, isPending: false }),
}));
vi.mock('@/shared/hooks/usePasskeys/index.ts', () => ({
  usePasskeys: usePasskeysMock,
  useRegisterPasskey: () => ({ mutateAsync: registerMutateAsync, isPending: false }),
  useRemovePasskey: () => ({ mutate: removePasskeyMutate, isPending: false }),
}));
vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { AccountSecurityPanel } from './AccountSecurityPanel.tsx';

beforeEach(() => {
  vi.clearAllMocks();
  useMfaStatusMock.mockReturnValue({ data: false });
  beginMutateAsync.mockResolvedValue({
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUri: 'otpauth://totp/Core:you?secret=JBSWY3DPEHPK3PXP&issuer=Core',
  });
  confirmMutateAsync.mockResolvedValue({ recoveryCodes: ['AAAA-1111', 'BBBB-2222'] });
  disableMutateAsync.mockResolvedValue(undefined);
  usePasskeysMock.mockReturnValue({
    data: [
      {
        id: 'pk_1',
        name: 'MacBook Touch ID',
        createdAt: '2026-02-10T10:00:00.000Z',
        lastUsedAt: null,
      },
    ],
  });
  registerMutateAsync.mockResolvedValue({ id: 'pk_2', name: 'YubiKey' });
});

describe('AccountSecurityPanel', () => {
  it('renders MFA status + setup + passkeys (sessions moved to their own panel)', () => {
    render(<AccountSecurityPanel />);
    expect(screen.getByTestId('settings-section-security')).toBeInTheDocument();
    expect(screen.getByTestId('security-overview')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-status')).toHaveTextContent('Disabled');
    expect(screen.getByTestId('mfa-setup')).toBeInTheDocument();
    expect(screen.getByTestId('add-passkey')).toBeInTheDocument();
    // the old duplicated sessions card is gone
    expect(screen.queryByTestId('session-s1')).not.toBeInTheDocument();
  });

  it('runs the enrollment flow: QR → code → recovery codes', async () => {
    const user = userEvent.setup();
    render(<AccountSecurityPanel />);
    await user.click(screen.getByTestId('mfa-setup'));
    expect(beginMutateAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('mfa-secret')).toHaveTextContent('JBSWY3DPEHPK3PXP');
    expect(await screen.findByTestId('mfa-qr')).toBeInTheDocument();
    await user.type(screen.getByTestId('mfa-code'), '123456');
    await waitFor(() => expect(confirmMutateAsync).toHaveBeenCalledWith('123456'));
    expect(await screen.findByTestId('mfa-recovery-codes')).toBeInTheDocument();
    await user.click(screen.getByTestId('recovery-codes-panel-ack'));
    await user.click(screen.getByTestId('mfa-done'));
  });

  it('shows Disable when enabled and confirms disabling', async () => {
    useMfaStatusMock.mockReturnValue({ data: true });
    const user = userEvent.setup();
    render(<AccountSecurityPanel />);
    expect(screen.getByTestId('mfa-status')).toHaveTextContent('Enabled');
    await user.click(screen.getByTestId('mfa-disable'));
    await user.click(screen.getByTestId('confirm-accept'));
    await waitFor(() => expect(disableMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('registers a passkey via the add dialog (FE-32)', async () => {
    const user = userEvent.setup();
    render(<AccountSecurityPanel />);
    await user.click(screen.getByTestId('add-passkey'));
    await user.type(await screen.findByTestId('passkey-name'), 'YubiKey');
    await user.click(screen.getByTestId('passkey-add-submit'));
    await waitFor(() => expect(registerMutateAsync).toHaveBeenCalledWith('YubiKey'));
  });

  it('revokes a passkey (FE-32)', async () => {
    const user = userEvent.setup();
    render(<AccountSecurityPanel />);
    await user.click(screen.getByTestId('passkey-remove'));
    expect(removePasskeyMutate).toHaveBeenCalledWith('pk_1');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AccountSecurityPanel />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
