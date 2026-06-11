import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

/**
 * URL search-param shape this hook reads and writes. A structural subset — any
 * route whose `validateSearch` schema includes these keys is compatible (e.g.
 * the dashboard's `dashboardSearchSchema`). Other search params the route
 * defines are preserved untouched.
 */
export interface DataTableSearch {
  /** Global table search query. */
  q?: string;
  /** Role facet filter (`all` or a specific org role). */
  role?: string;
  /** 1-based page index for pagination. */
  page?: number;
  /** Page size for pagination. */
  size?: number;
  /** Sort descriptor `columnId:asc|desc`. */
  sort?: string;
}

/** Maps URL search params to TanStack Table sorting state. */
export function sortingFromSearch(sort: string | undefined): SortingState {
  if (!sort) return [];
  const [id, dir] = sort.split(':');
  if (!id || (dir !== 'asc' && dir !== 'desc')) return [];
  return [{ id, desc: dir === 'desc' }];
}

/** Serializes TanStack Table sorting to a URL-safe string. */
export function sortingToSearch(sorting: SortingState): string | undefined {
  const first = sorting[0];
  if (!first) return undefined;
  return `${first.id}:${first.desc ? 'desc' : 'asc'}`;
}

/**
 * Bidirectional sync between TanStack Table state and the current route's URL
 * search params.
 *
 * Enables shareable/deep-linkable table views without an extra dependency (`nuqs`).
 * Route-agnostic: patches only the {@link DataTableSearch} keys on the route the
 * table is rendered in.
 *
 * @param enabled - When false, returns empty handlers (local-only table state).
 */
export function useDataTableUrlState(enabled: boolean) {
  const search = useSearch({ strict: false }) as DataTableSearch;
  const navigate = useNavigate();

  const initialSorting = useMemo(
    () => (enabled ? sortingFromSearch(search.sort) : []),
    // Only apply URL sort on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled],
  );

  const initialFilters = useMemo((): ColumnFiltersState => {
    if (!enabled) return [];
    const filters: ColumnFiltersState = [];
    if (search.q) filters.push({ id: 'name', value: search.q });
    if (search.role && search.role !== 'all')
      filters.push({ id: 'role', value: search.role });
    return filters;
  }, [enabled, search.q, search.role]);

  const initialPageIndex = enabled && search.page ? search.page - 1 : 0;
  const initialPageSize = enabled && search.size ? search.size : 10;

  const patchSearch = useCallback(
    (patch: Partial<DataTableSearch>) => {
      if (!enabled) return;
      const updater = (prev: DataTableSearch): DataTableSearch => {
        const next: DataTableSearch = { ...prev, ...patch };
        if (next.q === undefined) delete next.q;
        if (next.role === undefined) delete next.role;
        if (next.page === undefined) delete next.page;
        if (next.size === undefined) delete next.size;
        if (next.sort === undefined) delete next.sort;
        return next;
      };
      navigate({
        to: '.',
        // The router types `search` per route; this hook intentionally works on
        // the structural subset above, on whatever route it is rendered in.
        search: updater as never,
        replace: true,
      });
    },
    [enabled, navigate],
  );

  return {
    initialSorting,
    initialFilters,
    initialPageIndex,
    initialPageSize,
    onSortingChange: (sorting: SortingState) =>
      patchSearch({ sort: sortingToSearch(sorting), page: 1 }),
    onFiltersChange: (filters: ColumnFiltersState) => {
      const name = filters.find((f) => f.id === 'name')?.value as string | undefined;
      const role = filters.find((f) => f.id === 'role')?.value as string | undefined;
      patchSearch({
        q: name || undefined,
        role: role || undefined,
        page: 1,
      });
    },
    onPaginationChange: (pageIndex: number, pageSize: number) =>
      patchSearch({ page: pageIndex + 1, size: pageSize }),
    globalFilter: enabled ? (search.q ?? '') : undefined,
    setGlobalFilter: (value: string) => patchSearch({ q: value || undefined, page: 1 }),
  };
}
