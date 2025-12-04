/**
 * Hooks Index - Export all custom hooks
 */

// Auth
export { useAuth, AuthProvider, AuthContext, MockAuthProvider } from './useAuth';
export type { AuthContextType } from './useAuth';

// WebSocket
export { WebSocketProvider, useWebSocket } from './useWebSocket';
export type { WebSocketMessage } from './useWebSocket';

// Marketplace / Feed
export { useActivityFeed } from './useActivityFeed';
export type { FeedEvent } from './useActivityFeed';

// Data fetching
export { useInfiniteScroll } from './useInfiniteScroll';

// Mutations
export { useOptimisticMutation, useListingSave } from './useOptimisticMutation';
