/**
 * useOptimisticMutation - Hook for optimistic UI updates
 * 
 * Provides instant UI feedback while mutations are in flight,
 * with automatic rollback on failure.
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface OptimisticMutationOptions<TData, TVariables> {
  /** The actual mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Function to optimistically update local state */
  onOptimisticUpdate?: (variables: TVariables) => void;
  /** Function to rollback on error */
  onRollback?: (variables: TVariables, error: Error) => void;
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on mutation error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Show toast notifications */
  showToasts?: boolean;
  /** Success toast message */
  successMessage?: string;
  /** Error toast message */
  errorMessage?: string;
}

interface OptimisticMutationReturn<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | null>;
  /** Whether mutation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
  /** Reset error state */
  reset: () => void;
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  onOptimisticUpdate,
  onRollback,
  onSuccess,
  onError,
  showToasts = true,
  successMessage,
  errorMessage = 'Something went wrong',
}: OptimisticMutationOptions<TData, TVariables>): OptimisticMutationReturn<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      // Generate unique ID for this mutation
      const mutationId = Math.random().toString(36).substring(7);
      pendingRef.current.add(mutationId);

      setIsLoading(true);
      setError(null);

      // Apply optimistic update immediately
      onOptimisticUpdate?.(variables);

      try {
        const result = await mutationFn(variables);

        // Success
        onSuccess?.(result, variables);
        
        if (showToasts && successMessage) {
          toast.success(successMessage);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // Rollback optimistic update
        onRollback?.(variables, error);
        onError?.(error, variables);

        if (showToasts) {
          toast.error(errorMessage, {
            description: error.message,
          });
        }

        return null;
      } finally {
        pendingRef.current.delete(mutationId);
        if (pendingRef.current.size === 0) {
          setIsLoading(false);
        }
      }
    },
    [mutationFn, onOptimisticUpdate, onRollback, onSuccess, onError, showToasts, successMessage, errorMessage]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}

/**
 * Specialized hook for listing save/unsave with optimistic updates
 */
export function useListingSave(
  onSaveChange: (listingId: string, isSaved: boolean, saveCount: number) => void
) {
  const savedStateRef = useRef<Map<string, { isSaved: boolean; saveCount: number }>>(new Map());

  const saveMutation = useOptimisticMutation({
    mutationFn: async ({ listingId, action }: { listingId: string; action: 'save' | 'unsave' }) => {
      // Import apiClient dynamically to avoid circular deps
      const { apiClient } = await import('@/lib/api-client');
      
      if (action === 'save') {
        return apiClient.saveListing(listingId);
      } else {
        return apiClient.unsaveListing(listingId);
      }
    },
    onOptimisticUpdate: ({ listingId, action }) => {
      // Store previous state for rollback
      const current = savedStateRef.current.get(listingId);
      if (!current) return;

      const newSaved = action === 'save';
      const newCount = current.saveCount + (action === 'save' ? 1 : -1);
      
      onSaveChange(listingId, newSaved, Math.max(0, newCount));
    },
    onRollback: ({ listingId }) => {
      // Restore previous state
      const previous = savedStateRef.current.get(listingId);
      if (previous) {
        onSaveChange(listingId, previous.isSaved, previous.saveCount);
      }
    },
    successMessage: undefined, // Don't show toast for saves
    showToasts: false,
  });

  const toggleSave = useCallback(
    (listingId: string, currentlySaved: boolean, currentSaveCount: number) => {
      // Store current state before mutation
      savedStateRef.current.set(listingId, {
        isSaved: currentlySaved,
        saveCount: currentSaveCount,
      });

      return saveMutation.mutate({
        listingId,
        action: currentlySaved ? 'unsave' : 'save',
      });
    },
    [saveMutation]
  );

  return {
    toggleSave,
    isLoading: saveMutation.isLoading,
  };
}

export default useOptimisticMutation;
