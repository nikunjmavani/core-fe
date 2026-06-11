import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTablePagination } from './DataTablePagination.tsx';

function Harness() {
  const table = useReactTable({
    data: [{ name: 'Ada' }, { name: 'Grace' }],
    columns: [{ accessorKey: 'name', header: 'Name' }],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return <DataTablePagination table={table} />;
}

describe('DataTablePagination', () => {
  it('renders the pagination controls', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(4);
  });
});
