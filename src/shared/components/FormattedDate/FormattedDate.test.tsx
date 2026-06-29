import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/hooks/useLocaleFormat/index.ts', () => ({
  useLocaleFormat: () => ({
    formatDate: () => 'Jun 25, 2026',
    formatRelativeTime: () => '2 hours ago',
  }),
}));

import { FormattedDate } from './FormattedDate.tsx';

describe('FormattedDate', () => {
  it('renders a formatted absolute date', () => {
    render(<FormattedDate value="2026-06-25T14:30:00.000Z" />);
    expect(screen.getByText('Jun 25, 2026')).toBeInTheDocument();
  });

  it('renders relative time when requested', () => {
    render(<FormattedDate value="2026-06-25T14:30:00.000Z" relative />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });
});
