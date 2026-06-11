import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InviteStep } from './InviteStep.tsx';

describe('InviteStep', () => {
  it('adds an email to the invite list', async () => {
    const user = userEvent.setup();
    render(<InviteStep />);
    await user.type(screen.getByTestId('onboarding-invite-email'), 'a@b.co');
    await user.click(screen.getByTestId('onboarding-invite-add'));
    expect(screen.getByTestId('onboarding-invite-list')).toHaveTextContent('a@b.co');
  });
});
