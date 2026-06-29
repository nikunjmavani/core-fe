import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { useUIStore } from '@/shared/store/useUIStore/index.ts';

import { FloatingLanguageButton } from './FloatingLanguageButton.tsx';

describe('FloatingLanguageButton', () => {
  afterEach(() => useUIStore.setState({ languageOpen: false }));

  it('has no accessibility violations', async () => {
    const { container } = render(<FloatingLanguageButton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens the language side panel', async () => {
    const user = userEvent.setup();
    render(<FloatingLanguageButton />);

    expect(useUIStore.getState().languageOpen).toBe(false);
    await user.click(screen.getByTestId('floating-language'));
    expect(useUIStore.getState().languageOpen).toBe(true);
  });
});
