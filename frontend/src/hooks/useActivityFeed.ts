/**
 * useActivityFeed - Real-time activity feed hook for marketplace
 * 
 * Connects to the activity stream WebSocket and provides:
 * - Live feed events (new listings, price drops, sales)
 * - Connection status
 * - Auto-reconnection with exponential backoff
 * - Location-based subscription updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface FeedEvent {
  id: string;
  type: 'NEW_LISTING' | 'PRICE_DROP' | 'SOLD' | 'TRADE_COMPLETED' | 'RESTOCK';
  entity_type: string;
  entity_id: string;
  display_text: string;
  payload: {
    title?: string;
    brand?: string;
    price?: number;
    old_price?: number;
    new_price?: number;
    image_url?: string;
    trade_intent?: string;
    condition?: string;
  };
  created_at: string;
}

interface UseActivityFeedOptions {
  lat: number;
  lng: number;
  radius?: number;
  enabled?: boolean;
  onEvent?: (event: FeedEvent) => void;
  showToasts?: boolean;
}

interface UseActivityFeedReturn {
  events: FeedEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
  updateLocation: (lat: number, lng: number) => void;
  clearEvents: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const MAX_EVENTS = 50;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

export function useActivityFeed({
  lat,
  lng,
  radius = 3.0,
  enabled = true,
  onEvent,
  showToasts = false,
}: UseActivityFeedOptions): UseActivityFeedReturn {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const locationRef = useRef({ lat, lng, radius });

  // Update location ref when props change
  useEffect(() => {
    locationRef.current = { lat, lng, radius };
  }, [lat, lng, radius]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    if (!enabled || isConnecting || isConnected) return;

    const { lat, lng, radius } = locationRef.current;
    const wsUrl = `${WS_BASE_URL}/ws/activity?lat=${lat}&lng=${lng}&radius=${radius}`;

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 Activity feed connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'connected') {
            console.log('📍 Subscribed to', message.data.channels_count, 'channels');
            return;
          }

          if (message.type === 'feed_event' && message.data) {
            const feedEvent: FeedEvent = message.data;

            // Add to events list (keep max 50)
            setEvents((prev) => {
              const updated = [feedEvent, ...prev].slice(0, MAX_EVENTS);
              return updated;
            });

            // Call callback if provided
            onEvent?.(feedEvent);

            // Show toast for important events
            if (showToasts) {
              switch (feedEvent.type) {
                case 'NEW_LISTING':
                  toast.info(`New: ${feedEvent.payload.title}`, {
                    description: `$${feedEvent.payload.price} • ${feedEvent.payload.condition}`,
                  });
                  break;
                case 'PRICE_DROP':
                  toast.success(`Price Drop! ${feedEvent.payload.title}`, {
                    description: `Now $${feedEvent.payload.new_price} (was $${feedEvent.payload.old_price})`,
                  });
                  break;
                case 'SOLD':
                  toast.info(`Sold: ${feedEvent.payload.title}`);
                  break;
              }
            }
          }

          if (message.type === 'location_updated') {
            console.log('📍 Location updated:', message.data);
          }

          if (message.type === 'pong') {
            // Heartbeat response received
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (enabled && event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Connection failed after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setIsConnecting(false);
      setError('Failed to connect');
    }
  }, [enabled, isConnecting, isConnected, onEvent, showToasts]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  const updateLocation = useCallback((newLat: number, newLng: number) => {
    locationRef.current.lat = newLat;
    locationRef.current.lng = newLng;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'update_location',
          lat: newLat,
          lng: newLng,
        })
      );
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]); // Only re-run when enabled changes

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  return {
    events,
    isConnected,
    isConnecting,
    error,
    reconnect,
    updateLocation,
    clearEvents,
  };
}
