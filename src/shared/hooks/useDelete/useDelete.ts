import { useMutation, useQueryClient } from '@tanstack/react-query';

import { dataProvider } from '@/core/data-provider/index.ts';

/**
 * Delete a record by id. Invalidates the resource's queries on success.
 */
export function useDelete(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataProvider.delete(resource, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resource', resource] });
    },
  });
}
