import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { dismissMock } = vi.hoisted(() => ({ dismissMock: vi.fn() }));
vi.mock('sonner', () => ({ toast: { dismiss: dismissMock } }));

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { CustomToast } from './CustomToast.tsx';

describe('CustomToast', () => {
  it('renders the title + description and resolves a design variant', () => {
    render(<CustomToast id="t1" type="success" title="Saved" description="All good" />);
    const el = screen.getByTestId('app-toast');
    expect(el).toHaveTextContent('Saved');
    expect(el).toHaveTextContent('All good');
    expect(el.getAttribute('data-toast-variant')).toBeTruthy();
  });

  it('reflects the toastVariant from the theme store', () => {
    useThemeStore.getState().setToastVariant(1); // 'solid'
    render(<CustomToast id="t2" type="info" title="Info" />);
    expect(screen.getByTestId('app-toast')).toHaveAttribute(
      'data-toast-variant',
      'solid',
    );
    useThemeStore.getState().setToastVariant(0);
  });

  it('dismisses via the close button', async () => {
    const user = userEvent.setup();
    render(<CustomToast id="t3" type="error" title="Oops" />);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(dismissMock).toHaveBeenCalledWith('t3');
  });
});
