import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { AccountProfilePanel } from './AccountProfilePanel.tsx';

/** The panel renders ProfileForm, which uses `useMutation` (QueryClient). */
function renderQ(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AccountProfilePanel', () => {
  afterEach(() => {
    useAuthStore.setState({ user: undefined });
  });

  it('renders the panel', () => {
    renderQ(<AccountProfilePanel />);
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
  });

  // Regression: the Job title was hardcoded to '' here, so a saved job title never
  // reloaded (write succeeded, read always blank). It must initialize from the user.
  it('initializes Name and Job title from the saved profile', () => {
    useAuthStore.getState().setUser({
      id: 'usr_regression0123456789x',
      email: 'ada@acme.test',
      role: 'user',
      name: 'Ada Lovelace',
      jobTitle: 'Principal Engineer',
    });

    renderQ(<AccountProfilePanel />);

    expect(screen.getByDisplayValue('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Principal Engineer')).toBeInTheDocument();
  });
});
