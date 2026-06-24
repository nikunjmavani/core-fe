import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { toasterMock } = vi.hoisted(() => ({ toasterMock: vi.fn(() => null) }));
vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => toasterMock(props),
}));

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { AppToaster } from './AppToaster.tsx';

afterEach(() => {
  useThemeStore.getState().setToastPosition('top-right');
  toasterMock.mockClear();
});

describe('AppToaster', () => {
  it('passes the store toast position to sonner', () => {
    useThemeStore.getState().setToastPosition('bottom-center');
    render(<AppToaster />);
    expect(toasterMock).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'bottom-center' }),
    );
  });
});
