import { useMutation, useQueryClient } from '@tanstack/react-query';

import { dataProvider } from '@/core/data-provider/index.ts';

/**
 * Create a new record. Invalidates every query for this resource on
 * success so lists refresh immediately.
 */
export function useCreate<T, D = Partial<T>>(resource: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: D) => dataProvider.create<T, D>(resource, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resource', resource] });
    },
  });
}
