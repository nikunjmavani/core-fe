import { useQuery } from '@tanstack/react-query';

import type { ListParams } from '@/core/data-provider/dataProvider.ts';
import { dataProvider } from '@/core/data-provider/index.ts';

/**
 * Fetch a paginated/filtered/sorted list of records for any resource.
 * Wraps {@link dataProvider.getList} in a TanStack Query.
 *
 * Query key shape: `['resource', <name>, 'list', <params>]` — mutations
 * (`useCreate`, `useUpdate`, `useDelete`) invalidate the `<name>` prefix.
 */
export function useList<T>(resource: string, params?: ListParams) {
  return useQuery({
    queryKey: ['resource', resource, 'list', params] as const,
    queryFn: () => dataProvider.getList<T>(resource, params),
  });
}
