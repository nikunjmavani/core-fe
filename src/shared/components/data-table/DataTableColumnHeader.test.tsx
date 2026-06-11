import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTableColumnHeader } from './DataTableColumnHeader.tsx';

function Harness() {
  const table = useReactTable({
    data: [{ name: 'Ada' }],
    columns: [{ accessorKey: 'name', header: 'Name' }],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const column = table.getColumn('name');
  if (!column) throw new Error('column missing');
  return <DataTableColumnHeader column={column} title="Name" />;
}

describe('DataTableColumnHeader', () => {
  it('renders the sortable header trigger', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument();
  });
});
