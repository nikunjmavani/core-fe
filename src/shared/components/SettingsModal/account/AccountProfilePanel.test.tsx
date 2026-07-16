import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountProfilePanel } from './AccountProfilePanel.tsx';

/** The panel renders ProfileForm, which uses `useMutation` (QueryClient). */
function renderQ(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AccountProfilePanel', () => {
  it('renders the panel', () => {
    renderQ(<AccountProfilePanel />);
    expect(screen.getByTestId('settings-section-profile')).toBeInTheDocument();
  });
});
