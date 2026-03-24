'use client';

import { useState, useCallback } from 'react';

interface UseOptimisticMutationOptions<TData, TPayload> {
  onMutate: (payload: TPayload) => Promise<TData>;
  onOptimisticUpdate?: (payload: TPayload) => TData;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error, rollback: () => void) => void;
}

export function useOptimisticMutation<TData, TPayload>({
  onMutate,
  onOptimisticUpdate,
  onSuccess,
  onError,
}: UseOptimisticMutationOptions<TData, TPayload>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (payload: TPayload) => {
      setIsLoading(true);
      setError(null);

      let previousData: TData | null = null;

      // Apply optimistic update
      if (onOptimisticUpdate) {
        previousData = data;
        const optimistic = onOptimisticUpdate(payload);
        setData(optimistic);
      }

      try {
        const result = await onMutate(payload);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Rollback
        const rollback = () => {
          if (previousData !== null) {
            setData(previousData);
          }
        };

        if (onError) {
          onError(error, rollback);
        } else {
          rollback();
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [data, onMutate, onOptimisticUpdate, onSuccess, onError]
  );

  return { mutate, isLoading, error, data };
}
