import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { CallbackPage } from './CallbackPage.tsx';

describe('CallbackPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<CallbackPage />);
    expect(await screen.findByTestId('callback-page')).toBeInTheDocument();
  });
});
