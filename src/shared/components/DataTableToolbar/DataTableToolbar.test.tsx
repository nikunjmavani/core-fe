import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTableToolbar } from './DataTableToolbar.tsx';

function Harness() {
  const table = useReactTable({
    data: [{ name: 'Ada' }],
    columns: [{ accessorKey: 'name', header: 'Name' }],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  return <DataTableToolbar table={table} searchColumnId="name" />;
}

describe('DataTableToolbar', () => {
  it('renders the bound search input', () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
