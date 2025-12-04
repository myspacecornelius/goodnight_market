/**
 * useInfiniteScroll - Hook for implementing infinite scroll pagination
 * 
 * Features:
 * - Intersection Observer for efficient scroll detection
 * - Debounced loading to prevent rapid requests
 * - Error handling with retry capability
 * - Loading states
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
  /** Function to fetch data, receives offset and limit */
  fetchFn: (offset: number, limit: number) => Promise<T[]>;
  /** Number of items per page */
  limit?: number;
  /** Initial data to start with */
  initialData?: T[];
  /** Whether to start loading immediately */
  enabled?: boolean;
  /** Threshold for triggering load (0-1, distance from bottom) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

interface UseInfiniteScrollReturn<T> {
  /** All loaded items */
  items: T[];
  /** Whether currently loading more items */
  isLoading: boolean;
  /** Whether initial load is in progress */
  isInitialLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Ref to attach to the sentinel element */
  sentinelRef: (node: HTMLElement | null) => void;
  /** Manually trigger loading more items */
  loadMore: () => Promise<void>;
  /** Reset and reload from beginning */
  reset: () => void;
  /** Retry after error */
  retry: () => void;
  /** Prepend items (for real-time updates) */
  prependItems: (newItems: T[]) => void;
  /** Update a specific item */
  updateItem: (index: number, updater: (item: T) => T) => void;
  /** Remove an item */
  removeItem: (index: number) => void;
}

export function useInfiniteScroll<T>({
  fetchFn,
  limit = 20,
  initialData = [],
  enabled = true,
  threshold = 0.1,
  rootMargin = '100px',
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const offsetRef = useRef(initialData.length);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<HTMLElement | null>(null);
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !enabled) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const newItems = await fetchFn(offsetRef.current, limit);
      
      if (newItems.length < limit) {
        setHasMore(false);
      }

      setItems((prev) => [...prev, ...newItems]);
      offsetRef.current += newItems.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more items';
      setError(message);
      console.error('Infinite scroll error:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetchFn, limit, hasMore, enabled]);

  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    setIsInitialLoading(true);
    offsetRef.current = 0;
    isLoadingRef.current = false;
  }, []);

  const retry = useCallback(() => {
    setError(null);
    loadMore();
  }, [loadMore]);

  const prependItems = useCallback((newItems: T[]) => {
    setItems((prev) => [...newItems, ...prev]);
    offsetRef.current += newItems.length;
  }, []);

  const updateItem = useCallback((index: number, updater: (item: T) => T) => {
    setItems((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        updated[index] = updater(updated[index]);
      }
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      if (index >= 0 && index < updated.length) {
        updated.splice(index, 1);
        offsetRef.current = Math.max(0, offsetRef.current - 1);
      }
      return updated;
    });
  }, []);

  // Sentinel ref callback for intersection observer
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      sentinelNodeRef.current = node;

      if (!node || !enabled) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
            loadMore();
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observerRef.current.observe(node);
    },
    [enabled, hasMore, loadMore, threshold, rootMargin]
  );

  // Initial load
  useEffect(() => {
    if (enabled && items.length === 0 && hasMore) {
      loadMore();
    }
  }, [enabled]); // Only run on mount or when enabled changes

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    isLoading,
    isInitialLoading,
    error,
    hasMore,
    sentinelRef,
    loadMore,
    reset,
    retry,
    prependItems,
    updateItem,
    removeItem,
  };
}

export default useInfiniteScroll;
