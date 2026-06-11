import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QueryBoundary } from './QueryBoundary.tsx';

function asQuery(partial: Record<string, unknown>): UseQueryResult<string> {
  return {
    isPending: false,
    isError: false,
    isFetching: false,
    data: undefined,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as UseQueryResult<string>;
}

describe('QueryBoundary', () => {
  it('shows the skeleton while pending', () => {
    render(
      <QueryBoundary query={asQuery({ isPending: true })}>
        {(data) => <p>{data}</p>}
      </QueryBoundary>,
    );
    expect(screen.getByTestId('query-skeleton')).toBeInTheDocument();
  });

  it('shows the retry fallback with the message on error', () => {
    render(
      <QueryBoundary query={asQuery({ isError: true })} errorMessage="Boom">
        {(data) => <p>{data}</p>}
      </QueryBoundary>,
    );
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders the data via the render prop on success', () => {
    render(
      <QueryBoundary query={asQuery({ data: 'loaded' })}>
        {(data) => <p>{data}</p>}
      </QueryBoundary>,
    );
    expect(screen.getByText('loaded')).toBeInTheDocument();
  });
});
