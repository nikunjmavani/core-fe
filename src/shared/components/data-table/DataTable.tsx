import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { memo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table.tsx';

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  /** Message shown when the table has no rows. */
  emptyMessage?: string;
}

/**
 * Generic data-table renderer powered by TanStack Table.
 *
 * Usage:
 * ```tsx
 * const table = useReactTable({ data, columns, ... });
 * <DataTable table={table} />
 * ```
 */
function DataTableInner<TData>({
  table,
  emptyMessage = 'No results.',
}: DataTableProps<TData>) {
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className="text-muted-foreground h-24 text-center"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// memo wrapper preserving generic type parameter
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
