import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmailVerificationBanner } from './EmailVerificationBanner.tsx';

const { useMeContextMock, sendCodeMock } = vi.hoisted(() => ({
  useMeContextMock: vi.fn(),
  sendCodeMock: vi.fn(),
}));
vi.mock('@/shared/auth/captcha/useTurnstileReady/index.ts', () => ({
  useTurnstileReady: () => true,
}));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
}));
vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { emailVerificationCodeSend: sendCodeMock },
}));

const ctx = (isEmailVerified: boolean, email = 'user@example.com') => ({
  data: { user: { isEmailVerified, email } },
});

afterEach(() => vi.clearAllMocks());

describe('EmailVerificationBanner', () => {
  it('renders nothing when the email is verified', () => {
    useMeContextMock.mockReturnValue(ctx(true));
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the context is loading', () => {
    useMeContextMock.mockReturnValue({ data: undefined });
    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a resend control when unverified and sends a sign-in code', async () => {
    useMeContextMock.mockReturnValue(ctx(false, 'user@example.com'));
    sendCodeMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<EmailVerificationBanner />);
    expect(screen.getByTestId('email-verify-banner')).toBeInTheDocument();

    await user.click(screen.getByTestId('email-verify-resend'));
    await waitFor(() => expect(sendCodeMock).toHaveBeenCalledWith('user@example.com'));
  });
});
