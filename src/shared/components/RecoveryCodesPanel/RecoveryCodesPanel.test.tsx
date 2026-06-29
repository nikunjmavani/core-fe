import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { notify } from '@/shared/notify/index.ts';

import { RecoveryCodesPanel } from './RecoveryCodesPanel.tsx';

vi.mock('@/shared/notify/index.ts', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/sensitive-clipboard.ts', () => ({
  copySensitiveText: vi.fn().mockResolvedValue(true),
}));

describe('RecoveryCodesPanel', () => {
  it('masks codes until reveal and requires acknowledgment before Done', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<RecoveryCodesPanel codes={['AAAA-1111', 'BBBB-2222']} onDone={onDone} />);

    expect(screen.getAllByText('••••-••••')).toHaveLength(2);
    expect(screen.getByTestId('mfa-done')).toBeDisabled();

    await user.click(screen.getByTestId('recovery-codes-panel-toggle-reveal'));
    expect(screen.getByText('AAAA-1111')).toBeInTheDocument();

    await user.click(screen.getByTestId('recovery-codes-panel-ack'));
    await user.click(screen.getByTestId('mfa-done'));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('copies all codes via sensitive clipboard', async () => {
    const { copySensitiveText } = await import('@/lib/sensitive-clipboard.ts');
    const user = userEvent.setup();
    render(<RecoveryCodesPanel codes={['AAAA-1111']} onDone={vi.fn()} />);

    await user.click(screen.getByTestId('recovery-codes-panel-copy-all'));
    await waitFor(() => expect(copySensitiveText).toHaveBeenCalledWith('AAAA-1111'));
    expect(notify.success).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RecoveryCodesPanel codes={['AAAA-1111']} onDone={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
