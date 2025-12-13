/**
 * Enhanced Signals React Hooks
 * 
 * Custom hooks for interacting with the geospatial signals system.
 * Uses React Query for caching, background updates, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Signal,
  SignalCreate,
  SignalList,
  ListSignalsParams,
  SignalHeatmap,
  HeatmapParams,
  SignalStats,
  BoostSignalResponse,
  TimeWindow,
  SignalType,
} from '@/types/signals';
import { toast } from 'sonner';

// Query keys for React Query cache management
export const signalsKeys = {
  all: ['signals'] as const,
  lists: () => [...signalsKeys.all, 'list'] as const,
  list: (params?: ListSignalsParams) => [...signalsKeys.lists(), params] as const,
  heatmaps: () => [...signalsKeys.all, 'heatmap'] as const,
  heatmap: (params?: HeatmapParams) => [...signalsKeys.heatmaps(), params] as const,
  stats: (timeWindow?: TimeWindow) => [...signalsKeys.all, 'stats', timeWindow] as const,
};

/**
 * Fetch list of signals with filtering and pagination
 * 
 * @param params - Filtering options (bbox, city, signal_type, etc.)
 * @example
 * ```tsx
 * const { data: signals, isLoading } = useSignals({
 *   bbox: "-74.0,40.7,-73.9,40.8",
 *   signal_type: "SPOTTED",
 *   time_window: "24h",
 *   page: 1
 * });
 * ```
 */
export function useSignals(
  params: ListSignalsParams = {},
  options?: Omit<UseQueryOptions<SignalList>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: signalsKeys.list(params),
    queryFn: () => apiClient.listSignals(params),
    staleTime: 60000, // 1 minute - signals update frequently
    ...options,
  });
}

/**
 * Fetch signal heatmap data for map visualization
 * Shows aggregated signals in geohash buckets
 * 
 * @param params - Bounding box, zoom level, time window
 * @example
 * ```tsx
 * const { data: heatmap } = useSignalHeatmap({
 *   bbox: "-74.0,40.7,-73.9,40.8",
 *   zoom: 7,
 *   time_window: "24h"
 * });
 * ```
 */
export function useSignalHeatmap(
  params: HeatmapParams = {},
  options?: Omit<UseQueryOptions<SignalHeatmap>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: signalsKeys.heatmap(params),
    queryFn: () => apiClient.getSignalHeatmap(params),
    staleTime: 120000, // 2 minutes - heatmaps are more stable
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Fetch signal statistics
 * Get counts and breakdowns by type, brand, etc.
 * 
 * @param timeWindow - Time window for stats (1h, 24h, 7d)
 * @example
 * ```tsx
 * const { data: stats } = useSignalStats('24h');
 * console.log(`Total signals: ${stats?.total_signals}`);
 * ```
 */
export function useSignalStats(
  timeWindow: TimeWindow = '24h',
  options?: Omit<UseQueryOptions<SignalStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: signalsKeys.stats(timeWindow),
    queryFn: () => apiClient.getSignalStats(timeWindow),
    staleTime: 300000, // 5 minutes
    ...options,
  });
}

/**
 * Create a new signal
 * Posts a new geospatial signal to the community
 * Automatically invalidates signal lists and heatmaps
 * 
 * @example
 * ```tsx
 * const createSignal = useCreateSignal();
 * 
 * <Button 
 *   onClick={() => createSignal.mutate({
 *     latitude: 40.7230,
 *     longitude: -74.0030,
 *     signal_type: "SPOTTED",
 *     text_content: "Nike Dunk Low Panda at Foot Locker!",
 *     brand: "Nike",
 *     visibility: "public"
 *   })}
 * >
 *   Post Signal
 * </Button>
 * ```
 */
export function useCreateSignal(
  options?: Omit<UseMutationOptions<Signal, any, SignalCreate>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignalCreate) => apiClient.createSignal(data),
    
    onSuccess: (data) => {
      // Invalidate all signal lists and heatmaps
      queryClient.invalidateQueries({ queryKey: signalsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: signalsKeys.heatmaps() });
      queryClient.invalidateQueries({ queryKey: signalsKeys.stats() });
      
      toast.success('Signal Posted!', {
        description: `Your ${data.signal_type} signal is now live`,
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create signal';
      
      // Handle duplicate signal error
      if (error.response?.status === 409) {
        toast.error('Duplicate Signal', {
          description: 'A similar signal already exists in this location',
          duration: 5000,
        });
      }
      // Handle rate limiting
      else if (error.response?.status === 429) {
        toast.error('Too Many Signals', {
          description: 'Please wait before creating another signal',
          duration: 5000,
        });
      }
      // General error
      else {
        toast.error('Signal Failed', {
          description: errorMessage,
          duration: 5000,
        });
      }
    },
    
    ...options,
  });
}

/**
 * Boost a signal (like/upvote)
 * Shows support for a community signal
 * Invalidates signal lists to refresh boost counts
 * 
 * @example
 * ```tsx
 * const boostSignal = useBoostSignal();
 * 
 * <Button 
 *   onClick={() => boostSignal.mutate('signal_123')}
 *   disabled={boostSignal.isPending}
 * >
 *   👍 Boost
 * </Button>
 * ```
 */
export function useBoostSignal(
  options?: Omit<UseMutationOptions<BoostSignalResponse, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (signalId: string) => apiClient.boostSignal(signalId),
    
    onSuccess: (data) => {
      // Invalidate signal lists to refresh boost counts
      queryClient.invalidateQueries({ queryKey: signalsKeys.lists() });
      
      toast.success('Signal Boosted!', {
        description: `Now has ${data.boost_count} boosts`,
        duration: 3000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to boost signal';
      toast.error('Boost Failed', {
        description: errorMessage,
        duration: 4000,
      });
    },
    
    ...options,
  });
}

/**
 * Get signals by specific type
 * Helper hook for filtering by signal type
 * 
 * @param signalType - Type of signal to filter
 * @param params - Additional filter parameters
 * @example
 * ```tsx
 * const { data: spotted } = useSignalsByType('SPOTTED', {
 *   time_window: '24h',
 *   city: 'nyc'
 * });
 * ```
 */
export function useSignalsByType(
  signalType: SignalType,
  params: Omit<ListSignalsParams, 'signal_type'> = {}
) {
  return useSignals({ ...params, signal_type: signalType });
}

/**
 * Get signals for a specific city
 * Helper hook for city-based filtering
 * 
 * @param city - City name (boston, nyc, la, chicago)
 * @param params - Additional filter parameters
 * @example
 * ```tsx
 * const { data: bos tonSignals } = useSignalsByCity('boston', {
 *   signal_type: 'STOCK_CHECK'
 * });
 * ```
 */
export function useSignalsByCity(
  city: string,
  params: Omit<ListSignalsParams, 'city'> = {}
) {
  return useSignals({ ...params, city });
}

/**
 * Get signals within a bounding box
 * Helper for map-based displays
 * 
 * @param bbox - Bounding box "min_lng,min_lat,max_lng,max_lat"
 * @param params - Additional filter parameters
 * @example
 * ```tsx
 * const bbox = "-74.0,40.7,-73.9,40.8";
 * const { data: areaSignals } = useSignalsInBBox(bbox, {
 *   time_window: '1h'
 * });
 * ```
 */
export function useSignalsInBBox(
  bbox: string,
  params: Omit<ListSignalsParams, 'bbox'> = {}
) {
  return useSignals({ ...params, bbox });
}

/**
 * Get signals by brand
 * Filter signals mentioning a specific brand
 * 
 * @param brand - Brand name to filter
 * @param params - Additional filter parameters
 * @example
 * ```tsx
 * const { data: nikeSignals } = useSignalsByBrand('Nike', {
 *   signal_type: 'SPOTTED'
 * });
 * ```
 */
export function useSignalsByBrand(
  brand: string,
  params: Omit<ListSignalsParams, 'brand'> = {}
) {
  return useSignals({ ...params, brand });
}

/**
 * Get recent signals (last hour)
 * Quick access to latest activity
 * 
 * @param params - Optional filter parameters
 * @example
 * ```tsx
 * const { data: recent } = useRecentSignals({ city: 'nyc' });
 * ```
 */
export function useRecentSignals(params: Omit<ListSignalsParams, 'time_window'> = {}) {
  return useSignals({ ...params, time_window: '1h' });
}

/**
 * Check if user can create a signal
 * Based on rate limiting (5 signals per 15 minutes)
 * Note: This is a client-side estimate, server enforces actual limit
 * 
 * @returns boolean indicating if user should be able to create signal
 */
export function useCanCreateSignal(): boolean {
  // This is a simple client-side helper
  // The actual rate limiting is enforced server-side
  // Could be enhanced to track user's recent signals from cache
  return true; // For now, always allow - server will reject if rate limited
}

/**
 * Get signal type emoji icon
 * Helper function for display
 * 
 * @param signalType - Type of signal
 * @returns Emoji icon for the signal type
 * 
 * @example
 * ```tsx
 * const icon = getSignalTypeIcon('SPOTTED');
 * <span>{icon} Spotted</span>
 * ```
 */
export function getSignalTypeIcon(signalType: SignalType): string {
  const icons: Record<SignalType, string> = {
    SPOTTED: '👀',
    STOCK_CHECK: '📦',
    LINE_UPDATE: '👥',
    INTEL_REPORT: '🔍',
    HEAT_CHECK: '🔥',
    DROP_ALERT: '🚨',
    GENERAL: '📍',
  };
  return icons[signalType] || '📍';
}

/**
 * Get signal type display name
 * Helper function for readable labels
 * 
 * @param signalType - Type of signal
 * @returns Human-readable label
 * 
 * @example
 * ```tsx
 * const label = getSignalTypeLabel('STOCK_CHECK');
 * <Badge>{label}</Badge> // "Stock Check"
 * ```
 */
export function getSignalTypeLabel(signalType: SignalType): string {
  const labels: Record<SignalType, string> = {
    SPOTTED: 'Spotted',
    STOCK_CHECK: 'Stock Check',
    LINE_UPDATE: 'Line Update',
    INTEL_REPORT: 'Intel Report',
    HEAT_CHECK: 'Heat Check',
    DROP_ALERT: 'Drop Alert',
    GENERAL: 'General',
  };
  return labels[signalType] || signalType;
}
