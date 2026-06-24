import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import { Boxes } from './index.ts';

afterEach(() => {
  useThemeStore.setState({ iconLibrary: 'lucide' });
});

describe('icon barrel', () => {
  it('renders the Lucide icon by default', () => {
    const { container } = render(<Boxes className="size-4" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('class')).toContain('lucide');
  });

  it('swaps to the selected library once its lazy chunk loads', async () => {
    const { container } = render(<Boxes className="size-4" />);
    useThemeStore.getState().setIconLibrary('tabler');
    await waitFor(
      () => {
        expect(container.querySelector('svg')?.getAttribute('class')).toContain(
          'tabler-icon',
        );
      },
      { timeout: 4000 },
    );
  });
});
