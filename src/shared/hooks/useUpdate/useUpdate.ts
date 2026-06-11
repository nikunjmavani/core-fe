import { useMutation, useQueryClient } from '@tanstack/react-query';

import { dataProvider } from '@/core/data-provider/index.ts';

/**
 * Update an existing record. The mutation accepts `{ id, data }`; on
 * success it invalidates every query for this resource so the cache
 * reflects the patch.
 */
export function useUpdate<T, D = Partial<T>>(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: D }) =>
      dataProvider.update<T, D>(resource, id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resource', resource] });
    },
  });
}
