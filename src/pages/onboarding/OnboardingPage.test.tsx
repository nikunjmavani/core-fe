import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

import { OnboardingPage } from './OnboardingPage.tsx';

describe('OnboardingPage', () => {
  it('renders the page container', async () => {
    renderWithProviders(<OnboardingPage />);
    expect(await screen.findByTestId('onboarding-page')).toBeInTheDocument();
  });
});
