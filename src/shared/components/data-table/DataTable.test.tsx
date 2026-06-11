import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable.tsx';

const COLUMNS = [{ accessorKey: 'name', header: 'Name' }];
const DATA = [{ name: 'Ada' }, { name: 'Grace' }];

function Harness() {
  const table = useReactTable({
    data: DATA,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  });
  return <DataTable table={table} />;
}

describe('DataTable', () => {
  it('renders header and rows from the table instance', () => {
    render(<Harness />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });
});
