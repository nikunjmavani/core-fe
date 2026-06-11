import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { AcceptInvitePage } from './AcceptInvitePage.tsx';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ invitationId: 'inv_test' }) };
});

describe('AcceptInvitePage', () => {
  it('renders the page container while processing the invitation', async () => {
    renderWithProviders(<AcceptInvitePage />);
    expect(await screen.findByTestId('accept-invite-page')).toBeInTheDocument();
  });
});
