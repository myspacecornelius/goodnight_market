/**
 * Listings React Hooks
 * 
 * Custom hooks for marketplace listing management and CRUD operations.
 * Uses React Query for caching, background updates, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ListingCreate,
  ListingUpdate,
  ListingResponse,
  PriceDropRequest,
  PriceDropResponse,
  MarkSoldResponse,
  SaveResponse,
} from '@/types/listings';
import { toast } from 'sonner';

// Query keys for React Query cache management
export const listingsKeys = {
  all: ['listings'] as const,
  details: () => [...listingsKeys.all, 'detail'] as const,
  detail: (id: string) => [...listingsKeys.details(), id] as const,
  myListings: () => [...listingsKeys.all, 'my-listings'] as const,
  saved: () => [...listingsKeys.all, 'saved'] as const,
};

/**
 * Fetch a single listing by ID
 * Records a view if not the owner
 * 
 * @param listingId - ID of the listing to fetch
 * @example
 * ```tsx
 * const { data: listing, isLoading } = useListing('listing_123');
 * ```
 */
export function useListing(
  listingId: string,
  options?: Omit<UseQueryOptions<ListingResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: listingsKeys.detail(listingId),
    queryFn: () => apiClient.getListing(listingId),
    staleTime: 120000, // 2 minutes
    enabled: !!listingId,
    ...options,
  });
}

/**
 * Create a new listing
 * Automatically invalidates related queries
 * 
 * @example
 * ```tsx
 * const createListing = useCreateListing();
 * 
 * <Button 
 *   onClick={() => createListing.mutate({
 *     title: "Nike Dunk Low Panda",
 *     brand: "Nike",
 *     size: "10.5",
 *     condition: "DS",
 *     images: ["url1", "url2"],
 *     price: 150,
 *     latitude: 40.7230,
 *     longitude: -74.0030
 *   })}
 *   disabled={createListing.isPending}
 * >
 *   Create Listing
 * </Button>
 * ```
 */
export function useCreateListing(
  options?: Omit<UseMutationOptions<ListingResponse, any, ListingCreate>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ListingCreate) => apiClient.createListing(data),
    
    onSuccess: (data) => {
      // Invalidate listings queries to show the new listing
      queryClient.invalidateQueries({ queryKey: listingsKeys.myListings() });
      
      // Pre-populate the detail cache
      queryClient.setQueryData(listingsKeys.detail(data.id), data);
      
      toast.success('Listing Created!', {
        description: `${data.title} is now live`,
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create listing';
      toast.error('Creation Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Update an existing listing
 * Automatically invalidates the listing detail
 * 
 * @example
 * ```tsx
 * const updateListing = useUpdateListing();
 * 
 * <Button 
 *   onClick={() => updateListing.mutate({
 *     listingId: 'listing_123',
 *     data: {
 *       title: "Updated Title",
 *       price: 140
 *     }
 *   })}
 * >
 *   Update Listing
 * </Button>
 * ```
 */
export function useUpdateListing(
  options?: Omit<
    UseMutationOptions<ListingResponse, any, { listingId: string; data: ListingUpdate }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: ListingUpdate }) =>
      apiClient.updateListing(listingId, data),
    
    onSuccess: (data, variables) => {
      // Update the detail cache
      queryClient.setQueryData(listingsKeys.detail(variables.listingId), data);
      
      // Invalidate my listings
      queryClient.invalidateQueries({ queryKey: listingsKeys.myListings() });
      
      toast.success('Listing Updated!', {
        duration: 3000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update listing';
      toast.error('Update Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Drop the price of a listing
 * Creates a price drop event in the feed
 * 
 * @example
 * ```tsx
 * const dropPrice = useDropListingPrice();
 * 
 * <Button 
 *   onClick={() => dropPrice.mutate({
 *     listingId: 'listing_123',
 *     newPrice: 120
 *   })}
 * >
 *   Drop Price
 * </Button>
 * ```
 */
export function useDropListingPrice(
  options?: Omit<
    UseMutationOptions<PriceDropResponse, any, { listingId: string; newPrice: number }>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, newPrice }: { listingId: string; newPrice: number }) =>
      apiClient.dropListingPrice(listingId, { new_price: newPrice }),
    
    onSuccess: (data, variables) => {
      // Invalidate listing detail to refresh with new price
      queryClient.invalidateQueries({ queryKey: listingsKeys.detail(variables.listingId) });
      
      // Invalidate my listings
      queryClient.invalidateQueries({ queryKey: listingsKeys.myListings() });
      
      toast.success('Price Dropped!', {
        description: `${data.drop_percent.toFixed(1)}% off - now $${data.new_price}`,
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to drop price';
      toast.error('Price Drop Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Mark a listing as sold
 * Updates status and creates sold event
 * 
 * @example
 * ```tsx
 * const markSold = useMarkListingSold();
 * 
 * <Button 
 *   onClick={() => markSold.mutate('listing_123')}
 *   disabled={markSold.isPending}
 * >
 *   Mark as Sold
 * </Button>
 * ```
 */
export function useMarkListingSold(
  options?: Omit<UseMutationOptions<MarkSoldResponse, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiClient.markListingSold(listingId),
    
    onSuccess: (data, listingId) => {
      // Update the listing detail cache with new status
      queryClient.setQueryData<ListingResponse>(
        listingsKeys.detail(listingId),
        (old) => old ? { ...old, status: data.status } : undefined
      );
      
      // Invalidate my listings
      queryClient.invalidateQueries({ queryKey: listingsKeys.myListings() });
      
      toast.success('Listing Marked as Sold!', {
        description: 'Congratulations on your sale! 🎉',
        duration: 4000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to mark as sold';
      toast.error('Operation Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Delete a listing
 * Removes from all caches
 * 
 * @example
 * ```tsx
 * const deleteListing = useDeleteListing();
 * 
 * <Button 
 *   onClick={() => {
 *     if (confirm('Delete this listing?')) {
 *       deleteListing.mutate('listing_123');
 *     }
 *   }}
 *   variant="destructive"
 * >
 *   Delete Listing
 * </Button>
 * ```
 */
export function useDeleteListing(
  options?: Omit<UseMutationOptions<void, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiClient.deleteListing(listingId),
    
    onSuccess: (_, listingId) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: listingsKeys.detail(listingId) });
      
      // Invalidate my listings
      queryClient.invalidateQueries({ queryKey: listingsKeys.myListings() });
      
      toast.success('Listing Deleted', {
        duration: 3000,
      });
    },
    
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete listing';
      toast.error('Deletion Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
    
    ...options,
  });
}

/**
 * Save/bookmark a listing
 * Adds to user's saved listings
 * 
 * @example
 * ```tsx
 * const saveListing = useSaveListing();
 * 
 * <Button 
 *   onClick={() => saveListing.mutate('listing_123')}
 *   disabled={saveListing.isPending}
 * >
 *   💾 Save
 * </Button>
 * ```
 */
export function useSaveListing(
  options?: Omit<UseMutationOptions<SaveResponse, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiClient.saveListing(listingId),
    
    onMutate: async (listingId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: listingsKeys.detail(listingId) });
      
      // Optimistically update save count
      const previousListing = queryClient.getQueryData<ListingResponse>(
        listingsKeys.detail(listingId)
      );
      
      if (previousListing) {
        queryClient.setQueryData<ListingResponse>(listingsKeys.detail(listingId), {
          ...previousListing,
          save_count: previousListing.save_count + 1,
        });
      }
      
      return { previousListing };
    },
    
    onSuccess: (data, listingId) => {
      // Invalidate to refresh with actual data
      queryClient.invalidateQueries({ queryKey: listingsKeys.detail(listingId) });
      queryClient.invalidateQueries({ queryKey: listingsKeys.saved() });
      
      toast.success('Listing Saved!', {
        description: `${data.save_count} total saves`,
        duration: 3000,
      });
    },
    
    onError: (error: any, listingId, context) => {
      // Rollback optimistic update
      const ctx = context as { previousListing?: ListingResponse };
      if (ctx?.previousListing) {
        queryClient.setQueryData(
          listingsKeys.detail(listingId),
          ctx.previousListing
        );
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to save listing';
      
      if (error.response?.status === 400) {
        toast.info('Already Saved', {
          description: 'You already saved this listing',
          duration: 3000,
        });
      } else {
        toast.error('Save Failed', {
          description: errorMessage,
          duration: 4000,
        });
      }
    },
    
    ...options,
  });
}

/**
 * Unsave/remove bookmark from a listing
 * 
 * @example
 * ```tsx
 * const unsaveListing = useUnsaveListing();
 * 
 * <Button 
 *   onClick={() => unsaveListing.mutate('listing_123')}
 *   variant="ghost"
 * >
 *   Remove Save
 * </Button>
 * ```
 */
export function useUnsaveListing(
  options?: Omit<UseMutationOptions<void, any, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => apiClient.unsaveListing(listingId),
    
    onMutate: async (listingId: string) => {
      // Optimistically update save count
      await queryClient.cancelQueries({ queryKey: listingsKeys.detail(listingId) });
      
      const previousListing = queryClient.getQueryData<ListingResponse>(
        listingsKeys.detail(listingId)
      );
      
      if (previousListing) {
        queryClient.setQueryData<ListingResponse>(listingsKeys.detail(listingId), {
          ...previousListing,
          save_count: Math.max(0, previousListing.save_count - 1),
        });
      }
      
      return { previousListing };
    },
    
    onSuccess: (_, listingId) => {
      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: listingsKeys.detail(listingId) });
      queryClient.invalidateQueries({ queryKey: listingsKeys.saved() });
      
      toast.success('Save Removed', {
        duration: 2000,
      });
    },
    
    onError: (error: any, listingId, context) => {
      // Rollback
      const ctx = context as { previousListing?: ListingResponse };
      if (ctx?.previousListing) {
        queryClient.setQueryData(
          listingsKeys.detail(listingId),
          ctx.previousListing
        );
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to unsave listing';
      toast.error('Unsave Failed', {
        description: errorMessage,
        duration: 4000,
      });
    },
    
    ...options,
  });
}

/**
 * Toggle save status of a listing
 * Convenience hook that saves or unsaves based on current state
 * 
 * @param listingId - ID of the listing
 * @param isSaved - Current save status
 * @returns Mutation for toggling save
 * 
 * @example
 * ```tsx
 * const toggleSave = useToggleSaveListing(listingId, isSaved);
 * 
 * <Button onClick={() => toggleSave.mutate()}>
 *   {isSaved ? '❤️' : '🤍'} {isSaved ? 'Saved' : 'Save'}
 * </Button>
 * ```
 */
export function useToggleSaveListing(listingId: string, isSaved: boolean) {
  const save = useSaveListing();
  const unsave = useUnsaveListing();
  
  return {
    mutate: () => {
      if (isSaved) {
        unsave.mutate(listingId);
      } else {
        save.mutate(listingId);
      }
    },
    isPending: save.isPending || unsave.isPending,
  };
}

/**
 * Check if user owns a listing
 * 
 * @param listingId - ID of the listing
 * @param userId - Current user's ID
 * @returns Boolean indicating ownership
 * 
 * @example
 * ```tsx
 * const isOwner = useIsListingOwner(listingId, currentUser.id);
 * {isOwner && <EditButton />}
 * ```
 */
export function useIsListingOwner(listingId: string, userId?: string): boolean {
  const { data: listing } = useListing(listingId);
  return listing?.user_id === userId;
}

/**
 * Get formatted price with currency
 * 
 * @param price - Price value
 * @returns Formatted price string
 * 
 * @example
 * ```tsx
 * const priceText = formatPrice(150);  // "$150.00"
 * ```
 */
export function formatPrice(price?: number): string {
  if (price === undefined || price === null) return 'Price not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Calculate price drop percentage
 * 
 * @param originalPrice - Original listing price
 * @param currentPrice - Current listing price
 * @returns Price drop percentage
 * 
 * @example
 * ```tsx
 * const dropPercent = calculatePriceDrop(200, 150);  // 25
 * ```
 */
export function calculatePriceDrop(
  originalPrice?: number,
  currentPrice?: number
): number {
  if (!originalPrice || !currentPrice || currentPrice >= originalPrice) return 0;
  return ((originalPrice - currentPrice) / originalPrice) * 100;
}
