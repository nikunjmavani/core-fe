import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmailVerificationBanner } from './EmailVerificationBanner.tsx';

const { useMeContextMock, resendMock, getTokenMock } = vi.hoisted(() => ({
  useMeContextMock: vi.fn(),
  resendMock: vi.fn(),
  getTokenMock: vi.fn(),
}));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: useMeContextMock,
}));
vi.mock('@/shared/api/auth-api.ts', () => ({
  authApi: { resendVerification: resendMock },
}));
vi.mock('@/shared/auth/token.ts', () => ({ getAccessToken: getTokenMock }));

const ctx = (isEmailVerified: boolean) => ({ data: { user: { isEmailVerified } } });

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

  it('shows a resend control when unverified and resends with the token', async () => {
    useMeContextMock.mockReturnValue(ctx(false));
    getTokenMock.mockReturnValue('acc-token');
    resendMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<EmailVerificationBanner />);
    expect(screen.getByTestId('email-verify-banner')).toBeInTheDocument();

    await user.click(screen.getByTestId('email-verify-resend'));
    await waitFor(() => expect(resendMock).toHaveBeenCalledWith('acc-token'));
  });
});
