import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { InviteMemberDialog } from './InviteMemberDialog.tsx';

describe('InviteMemberDialog', () => {
  it('opens the invite form from its trigger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberDialog />);

    await user.click(await screen.findByTestId('invite-member-open'));

    expect(await screen.findByTestId('invite-member-form')).toBeInTheDocument();
  });
});
