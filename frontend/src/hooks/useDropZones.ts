/**
 * Drop Zones React Hooks
 * 
 * Custom hooks for interacting with the Drop Zones system.
 * Uses React Query for caching, background updates, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  DropZone,
  DropZoneDetails,
  DropZoneCreate,
  ListDropZonesParams,
  CheckInRequest,
  CheckInResponse,
  JoinDropZoneResponse,
} from '@/types/dropzones';
import { toast } from 'sonner';

// Query keys for React Query cache management
export const dropZonesKeys = {
  all: ['dropzones'] as const,
  lists: () => [...dropZonesKeys.all, 'list'] as const,
  list: (params?: ListDropZonesParams) => [...dropZonesKeys.lists(), params] as const,
  details: () => [...dropZonesKeys.all, 'detail'] as const,
  detail: (id: string) => [...dropZonesKeys.details(), id] as const,
};

/**
 * Fetch list of drop zones with optional filtering
 * 
 * @param params - Bounding box, active status, pagination options
 * @example
 * ```tsx
 * const { data: dropzones, isLoading } = useDropZones({
 *   min_lat: 40.7,
 *   max_lat: 40.8,
 *   min_lng: -74.0,
 *   max_lng: -73.9,
 *   active_only: true
 * });
 * ```
 */
export function useDropZones(
  params: ListDropZonesParams = {},
  options?: Omit<UseQueryOptions<DropZone[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dropZonesKeys.list(params),
    queryFn: () => apiClient.listDropZones(params),
    staleTime: 300000, // 5 minutes - drop zones don't change frequently
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Fetch detailed information about a specific drop zone
 * Includes stats, recent check-ins, and member information
 * 
 * @param dropzoneId - ID of the drop zone to fetch
 * @example
 * ```tsx
 * const { data: details, isLoading } = useDropZoneDetails('dzn_123');
 * if (details) {
 *   console.log(`Members: ${details.member_count}`);
 *   console.log(`Total Check-ins: ${details.total_checkins}`);
 * }
 * ```
 */
export function useDropZoneDetails(
  dropzoneId: string,
  options?: Omit<UseQueryOptions<DropZoneDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dropZonesKeys.detail(dropzoneId),
    queryFn: () => apiClient.getDropZoneDetails(dropzoneId),
    staleTime: 120000, // 2 minutes - details change more often
    enabled: !!dropzoneId,
    ...options,
  });
}

/**
 * Create a new drop zone
 * User becomes the owner automatically
 * Invalidates drop zone lists on success
 * 
 * @example
 * ```tsx
 * const createDropZone = useCreateDropZone();
 * 
 * <Button 
 *   onClick={() => createDropZone.mutate({
 *     name: "SoHo Sneaker District",
 *     description: "Best sneaker spots in SoHo",
 *     latitude: 40.7230,
 *     longitude: -74.0030,
 *     radius_meters: 500,
 *     zone_type: "RETAIL_CLUSTER"
 *   })}
 * >
 *   Create Drop Zone
 * </Button>
 * ```
 */
export function useCreateDropZone(
  options?: Omit<UseMutationOptions<DropZone, any, DropZoneCreate>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DropZoneCreate) => apiClient.createDropZone(data),
    
    onSuccess: (data) => {
      // Invalidate all drop zone lists to show the new zone
      queryClient.invalidateQueries({ queryKey: dropZonesKeys.lists() });
      
      // Pre-populate the details cache for the new drop zone
      queryClient.setQueryData(dropZonesKeys.detail(data.id), {
        ...data,
        member_count: 1, // Creator is the first member
        total_checkins: 0,
        recent_checkins: [],
      });
      
      toast.success('Drop Zone Created!', {
        description: `${data.name} is now active`,
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create drop zone';
      toast.error('Creation Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Check in to a drop zone
 * Verifies location and awards LACES based on streak
 * Automatically invalidates drop zone details and LACES balance
 * 
 * @example
 * ```tsx
 * const checkIn = useCheckInToDropZone();
 * 
 * <Button 
 *   onClick={() => checkIn.mutate({
 *     dropzoneId: 'dzn_123',
 *     data: {
 *       latitude: 40.7230,
 *       longitude: -74.0030,
 *       message: "Great spot today!"
 *     }
 *   })}
 *   disabled={checkIn.isPending}
 * >
 *   Check In
 * </Button>
 * ```
 */
export function useCheckInToDropZone(
  options?: Omit<
    UseMutationOptions<CheckInResponse, any, { dropzoneId: string; data: CheckInRequest }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dropzoneId, data }: { dropzoneId: string; data: CheckInRequest }) =>
      apiClient.checkInToDropZone(dropzoneId, data),
    
    onSuccess: (data, variables) => {
      // Invalidate drop zone details to refresh stats
      queryClient.invalidateQueries({ 
        queryKey: dropZonesKeys.detail(variables.dropzoneId) 
      });
      
      // Invalidate LACES balance since check-ins award tokens
      queryClient.invalidateQueries({ queryKey: ['laces', 'balance'] });
      
      // Show success with streak info
      const streakText = data.streak_count > 1 
        ? `${data.streak_count} day streak! 🔥` 
        : 'First check-in!';
      
      toast.success('Checked In!', {
        description: `+${data.points_earned} LACES earned. ${streakText}`,
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to check in';
      toast.error('Check-In Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Join a drop zone as a member
 * Allows user to participate in the drop zone community
 * 
 * @example
 * ```tsx
 * const joinDropZone = useJoinDropZone();
 * 
 * <Button 
 *   onClick={() => joinDropZone.mutate('dzn_123')}
 *   disabled={joinDropZone.isPending}
 * >
 *   Join Drop Zone
 * </Button>
 * ```
 */
export function useJoinDropZone(
  options?: Omit<UseMutationOptions<JoinDropZoneResponse, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dropzoneId: string) => apiClient.joinDropZone(dropzoneId),
    
    onMutate: async (dropzoneId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: dropZonesKeys.detail(dropzoneId) });
      
      // Optimistically update member count
      const previousDetails = queryClient.getQueryData<DropZoneDetails>(
        dropZonesKeys.detail(dropzoneId)
      );
      
      if (previousDetails) {
        queryClient.setQueryData<DropZoneDetails>(dropZonesKeys.detail(dropzoneId), {
          ...previousDetails,
          stats: {
            ...previousDetails.stats,
            member_count: previousDetails.stats.member_count + 1,
          },
        });
      }
      
      return { previousDetails };
    },
    
    onSuccess: (data, dropzoneId) => {
      // Invalidate to refresh with actual data
      queryClient.invalidateQueries({ queryKey: dropZonesKeys.detail(dropzoneId) });
      
      toast.success('Joined Drop Zone!', {
        description: data.message,
        duration: 4000,
      });
    },
    
    onError: (error: any, dropzoneId, context) => {
      // Rollback optimistic update
      const ctx = context as { previousDetails?: DropZoneDetails };
      if (ctx?.previousDetails) {
        queryClient.setQueryData(
          dropZonesKeys.detail(dropzoneId),
          ctx.previousDetails
        );
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to join drop zone';
      toast.error('Join Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Get active drop zones only
 * Helper hook that filters for active zones
 * 
 * @example
 * ```tsx
 * const { data: activeZones } = useActiveDropZones({
 *   bbox: "-74.0,40.7,-73.9,40.8"
 * });
 * ```
 */
export function useActiveDropZones(params: Omit<ListDropZonesParams, 'active'> = {}) {
  return useDropZones({ ...params, active: true });
}

/**
 * Get nearby drop zones within a bounding box
 * Helper for map-based displays
 * 
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param delta - Distance delta (~0.05 = 5km radius)
 * @example
 * ```tsx
 * const { data: nearby } = useNearbyDropZones(40.7230, -74.0030, 0.05);
 * ```
 */
export function useNearbyDropZones(
  latitude: number,
  longitude: number,
  delta: number = 0.05 // ~5km radius
) {
  const minLng = longitude - delta;
  const minLat = latitude - delta;
  const maxLng = longitude + delta;
  const maxLat = latitude + delta;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  
  return useDropZones({ bbox, active: true });
}

/**
 * Get member count for a drop zone
 * 
 * @param dropzoneId - ID of the drop zone
 * @returns Member count
 * 
 * @example
 * ```tsx
 * const memberCount = useDropZoneMemberCount('dzn_123');
 * <Badge>{memberCount} members</Badge>
 * ```
 */
export function useDropZoneMemberCount(dropzoneId: string): number {
  const { data: details } = useDropZoneDetails(dropzoneId);
  return details?.stats.member_count ?? 0;
}

/**
 * Get total check-ins for a drop zone
 * 
 * @param dropzoneId - ID of the drop zone
 * @returns Total check-in count
 * 
 * @example
 * ```tsx
 * const checkIns = useDropZoneTotalCheckIns('dzn_123');
 * <Text>{checkIns} check-ins</Text>
 * ```
 */
export function useDropZoneTotalCheckIns(dropzoneId: string): number {
  const { data: details } = useDropZoneDetails(dropzoneId);
  return details?.stats.total_checkins ?? 0;
}
