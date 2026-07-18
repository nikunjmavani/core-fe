import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/errors/HttpError.ts';
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

const { navigateMock, getAccessTokenMock, acceptInvitationMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  acceptInvitationMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useParams: () => ({ invitationId: 'inv_test' }),
    useSearch: () => ({ token: 'test-token' }),
    useNavigate: () => navigateMock,
  };
});
vi.mock('@/shared/auth/token.ts', () => ({ getAccessToken: getAccessTokenMock }));
vi.mock('@/shared/api/organization-api.ts', () => ({
  acceptInvitation: acceptInvitationMock,
}));
vi.mock('@/shared/auth/service.ts', () => ({ silentRefresh: vi.fn() }));
vi.mock('@/shared/tenancy/switch.ts', () => ({
  switchToOrganization: vi.fn().mockResolvedValue(undefined),
}));

import { AcceptInvitePage } from './AcceptInvitePage.tsx';

const LOGIN_REDIRECT = {
  to: '/login',
  search: { redirect: '/accept-invite/inv_test?token=test-token' },
  replace: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  getAccessTokenMock.mockReturnValue('token');
  acceptInvitationMock.mockResolvedValue({
    organizationId: 'org_1',
    organizationName: 'Acme',
    organizationSlug: 'acme',
  });
});

describe('AcceptInvitePage', () => {
  it('renders the page container while processing the invitation', async () => {
    renderWithProviders(<AcceptInvitePage />);
    expect(await screen.findByTestId('accept-invite-page')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to login with the invite as the redirect', async () => {
    // The email recipient is usually not signed in — that must route to login
    // (deep link + token preserved), NOT render an "Invitation problem" card.
    getAccessTokenMock.mockReturnValue(null);
    renderWithProviders(<AcceptInvitePage />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(LOGIN_REDIRECT));
    expect(acceptInvitationMock).not.toHaveBeenCalled();
  });

  it('accepts immediately when a session is present', async () => {
    renderWithProviders(<AcceptInvitePage />);
    await waitFor(() =>
      expect(acceptInvitationMock).toHaveBeenCalledWith('inv_test', 'test-token'),
    );
    expect(await screen.findByTestId('accept-invite-success')).toBeInTheDocument();
  });

  it('recovers through login when the accept call itself 401s', async () => {
    // Session died between boot and accept — the invitation is still fine.
    acceptInvitationMock.mockRejectedValue(
      new HttpError('Unauthorized', 401, '/x', 'POST'),
    );
    renderWithProviders(<AcceptInvitePage />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(LOGIN_REDIRECT));
    expect(screen.queryByTestId('accept-invite-error')).not.toBeInTheDocument();
  });

  it('keeps the error card for non-auth failures (expired / mismatch)', async () => {
    acceptInvitationMock.mockRejectedValue(
      new HttpError('Forbidden', 403, '/x', 'POST', {
        error: { detail: 'Invitee email mismatch' },
      }),
    );
    renderWithProviders(<AcceptInvitePage />);

    expect(await screen.findByTestId('accept-invite-error')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith(LOGIN_REDIRECT);
  });
});
