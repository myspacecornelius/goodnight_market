/**
 * Hooks Index - Export all custom hooks
 */

// Auth
export { useAuth, AuthProvider, AuthContext, MockAuthProvider } from './useAuth';
export type { AuthContextType } from './useAuth';

// WebSocket
export { WebSocketProvider, useWebSocket } from './useWebSocket';
export type { WebSocketMessage, WebSocketContextType } from './useWebSocket';

// Marketplace / Feed
export { useActivityFeed } from './useActivityFeed';
export type { FeedEvent } from './useActivityFeed';

// Data fetching
export { useInfiniteScroll } from './useInfiniteScroll';

// Mutations
export { useOptimisticMutation, useListingSave } from './useOptimisticMutation';

// LACES Token Economy
export {
  useLacesBalance,
  useLacesLedger,
  useEarningOpportunities,
  useClaimStipend,
  useBoostPostWithLaces,
  useLacesBalanceSimple,
  useCanAffordLaces,
  useTransactionsByType,
  useCanClaimDailyStipend,
  useFormattedBalance,
  lacesKeys,
} from './useLaces';

// Drop Zones
export {
  useDropZones,
  useDropZoneDetails,
  useCreateDropZone,
  useCheckInToDropZone,
  useJoinDropZone,
  useActiveDropZones,
  useNearbyDropZones,
  useDropZoneMemberCount,
  useDropZoneTotalCheckIns,
  dropZonesKeys,
} from './useDropZones';

// Enhanced Signals
export {
  useSignals,
  useSignalHeatmap,
  useSignalStats,
  useCreateSignal,
  useBoostSignal,
  useSignalsByType,
  useSignalsByCity,
  useSignalsInBBox,
  useSignalsByBrand,
  useRecentSignals,
  useCanCreateSignal,
  getSignalTypeIcon,
  getSignalTypeLabel,
  signalsKeys,
} from './useSignals';

// Listings Management
export {
  useListing,
  useCreateListing,
  useUpdateListing,
  useDropListingPrice,
  useMarkListingSold,
  useDeleteListing,
  useSaveListing,
  useUnsaveListing,
  useToggleSaveListing,
  useIsListingOwner,
  formatPrice,
  calculatePriceDrop,
  listingsKeys,
} from './useListings';
