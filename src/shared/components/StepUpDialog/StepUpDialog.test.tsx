import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

const {
  listAuthMethods,
  stepUpWithPassword,
  stepUpWithEmailCode,
  stepUpWithTotp,
  sendCode,
  useMfaStatusMock,
} = vi.hoisted(() => ({
  listAuthMethods: vi.fn(),
  stepUpWithPassword: vi.fn(),
  stepUpWithEmailCode: vi.fn(),
  stepUpWithTotp: vi.fn(),
  sendCode: vi.fn(),
  useMfaStatusMock: vi.fn(),
}));
vi.mock('@/shared/api/step-up-api.ts', () => ({
  listAuthMethods,
  stepUpWithPassword,
  stepUpWithEmailCode,
  stepUpWithTotp,
  isStepUpRequiredError: vi.fn(),
}));
vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { emailVerificationCodeSend: sendCode },
}));
vi.mock('@/shared/hooks/useMfa/index.ts', () => ({
  useMfaStatus: useMfaStatusMock,
}));

import { StepUpDialog } from './StepUpDialog.tsx';

function renderDialog(props: Partial<Parameters<typeof StepUpDialog>[0]> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const onVerified = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <StepUpDialog open onOpenChange={vi.fn()} onVerified={onVerified} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onVerified };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: 'usr_1', email: 'you@acme.test', role: 'user' } as never,
    isAuthenticated: true,
  });
  useMfaStatusMock.mockReturnValue({ data: false });
  listAuthMethods.mockResolvedValue([]);
  sendCode.mockResolvedValue({});
});

describe('StepUpDialog', () => {
  it('passwordless-no-MFA: auto-sends the email code and verifies with it', async () => {
    stepUpWithEmailCode.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onVerified } = renderDialog();

    // Email factor resolved → the code is sent to the signed-in address once.
    await waitFor(() => expect(sendCode).toHaveBeenCalledWith('you@acme.test'));
    expect(screen.getByTestId('step-up-sent-to')).toHaveTextContent('you@acme.test');

    await user.type(screen.getByTestId('step-up-code'), 'A1B2C3');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(stepUpWithEmailCode).toHaveBeenCalledWith('A1B2C3'));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('password account: asks for the password and verifies with it', async () => {
    listAuthMethods.mockResolvedValue([{ id: 'am_1', methodType: 'PASSWORD' }]);
    stepUpWithPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onVerified } = renderDialog();

    const field = await screen.findByTestId('step-up-password');
    await user.type(field, 'hunter2');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(stepUpWithPassword).toHaveBeenCalledWith('hunter2'));
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(sendCode).not.toHaveBeenCalled();
  });

  it('MFA account: verifies a TOTP code via /auth/me/mfa/verify', async () => {
    useMfaStatusMock.mockReturnValue({ data: true });
    stepUpWithTotp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onVerified } = renderDialog();

    await user.type(await screen.findByTestId('step-up-code'), '123456');
    await user.click(screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(stepUpWithTotp).toHaveBeenCalledWith('123456'));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('never offers the email code for destructive actions (allowEmailCode=false)', async () => {
    renderDialog({ allowEmailCode: false });
    expect(await screen.findByTestId('step-up-password')).toBeInTheDocument();
    await waitFor(() => expect(listAuthMethods).toHaveBeenCalled());
    expect(sendCode).not.toHaveBeenCalled();
  });

  it('shows an inline error and keeps the dialog open when verification fails', async () => {
    stepUpWithEmailCode.mockRejectedValue(new Error('401'));
    const user = userEvent.setup();
    const { onVerified } = renderDialog();

    await waitFor(() => expect(sendCode).toHaveBeenCalled());
    await user.type(screen.getByTestId('step-up-code'), 'BADCD1');
    await user.click(screen.getByTestId('step-up-submit'));

    expect(await screen.findByTestId('step-up-error')).toBeInTheDocument();
    expect(onVerified).not.toHaveBeenCalled();
  });
});
