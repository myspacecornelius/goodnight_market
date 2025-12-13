/**
 * Signals Types
 * 
 * TypeScript definitions for the Enhanced Signals feature - geospatial signals
 * for the sneaker community including spotted, stock checks, line updates, etc.
 * Matches backend schemas in services/routers/signals.py
 */

/**
 * Signal types - different categories of signals users can create
 */
export type SignalType = 
  | 'SPOTTED'         // Spotted a rare shoe in the wild
  | 'STOCK_CHECK'     // Store has stock
  | 'LINE_UPDATE'     // Line/queue status at a store
  | 'INTEL_REPORT'    // General intelligence/info
  | 'HEAT_CHECK'      // What's hot right now
  | 'DROP_ALERT'      // Upcoming drop information
  | 'GENERAL';        // General signal

/**
 * Signal visibility settings
 */
export type SignalVisibility = 'public' | 'local' | 'followers' | 'private';

/**
 * Time window options for filtering signals
 */
export type TimeWindow = '1h' | '24h' | '7d';

/**
 * Signal entity
 * Response from GET /signals and GET /signals/{id}
 */
export interface Signal {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  geohash: string;
  signal_type: SignalType;
  text_content?: string;
  media_url?: string;
  tags?: string[];
  brand?: string;
  reputation_score: number;
  boost_count: number;
  view_count: number;
  is_verified: boolean;
  created_at: string;  // ISO datetime
  visibility: SignalVisibility;
}

/**
 * Request to create a new signal
 * POST /signals
 */
export interface SignalCreate {
  latitude: number;
  longitude: number;
  signal_type: SignalType;
  text_content?: string;
  media_url?: string;
  tags?: string[];
  brand?: string;
  product_sku?: string;
  visibility?: SignalVisibility;
  expires_hours?: number;  // Auto-expire after N hours
}

/**
 * Paginated list of signals
 * Response from GET /signals
 */
export interface SignalList {
  signals: Signal[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

/**
 * Parameters for listing signals
 * GET /signals
 */
export interface ListSignalsParams {
  bbox?: string;           // "min_lng,min_lat,max_lng,max_lat"
  city?: string;           // City name (e.g., "boston", "nyc")
  signal_type?: SignalType;
  brand?: string;
  tags?: string;           // Comma-separated tags
  time_window?: TimeWindow;
  page?: number;
  per_page?: number;
}

/**
 * Heatmap bucket - aggregated signals in a geohash region
 */
export interface HeatmapBucket {
  geohash: string;
  center_lat: number;
  center_lng: number;
  signal_count: number;
  reputation_score: number;
  boost_count: number;
  heat_score: number;
  signal_types: Record<SignalType, number>;
  top_brands: Array<{ brand: string; count: number }>;
  recent_signals: Array<{
    id: string;
    signal_type: SignalType;
    text_content?: string;
    created_at: string;
  }>;
}

/**
 * Heatmap response
 * Response from GET /signals/heatmap
 */
export interface SignalHeatmap {
  buckets: HeatmapBucket[];
  total_signals: number;
  total_buckets: number;
  time_window: TimeWindow;
  zoom_level: number;
  bbox?: number[];  // [min_lng, min_lat, max_lng, max_lat]
}

/**
 * Parameters for heatmap request
 * GET /signals/heatmap
 */
export interface HeatmapParams {
  bbox?: string;           // "min_lng,min_lat,max_lng,max_lat"
  zoom?: number;           // Geohash precision level (4-10)
  time_window?: TimeWindow;
}

/**
 * Signal statistics
 * Response from GET /signals/stats
 */
export interface SignalStats {
  time_window: TimeWindow;
  total_signals: number;
  active_signals: number;
  flagged_signals: number;
  signal_types: Array<{
    type: SignalType;
    count: number;
  }>;
  top_brands: Array<{
    brand: string;
    count: number;
  }>;
}

/**
 * Boost signal response
 * Response from POST /signals/{id}/boost
 */
export interface BoostSignalResponse {
  message: string;
  boost_count: number;
}

/**
 * Signal with distance from user
 * Helper type for displaying nearby signals
 */
export interface SignalWithDistance extends Signal {
  distance_miles?: number;
  distance_meters?: number;
}

/**
 * City bounding box configuration
 * For quick city-based filtering
 */
export interface CityBounds {
  name: string;
  bbox: string;  // "min_lng,min_lat,max_lng,max_lat"
  center: {
    lat: number;
    lng: number;
  };
}

/**
 * Predefined city locations
 */
export const CITY_BOUNDS: Record<string, CityBounds> = {
  boston: {
    name: 'Boston',
    bbox: '42.3,42.4,-71.2,-71.0',
    center: { lat: 42.35, lng: -71.1 }
  },
  nyc: {
    name: 'New York City',
    bbox: '40.6,40.8,-74.1,-73.9',
    center: { lat: 40.7, lng: -74.0 }
  },
  la: {
    name: 'Los Angeles',
    bbox: '33.9,34.1,-118.3,-118.1',
    center: { lat: 34.0, lng: -118.2 }
  },
  chicago: {
    name: 'Chicago',
    bbox: '41.8,42.0,-87.8,-87.6',
    center: { lat: 41.9, lng: -87.7 }
  }
};

/**
 * Signal filter options for UI
 */
export interface SignalFilters {
  signalType?: SignalType;
  brand?: string;
  tags?: string[];
  timeWindow?: TimeWindow;
  city?: string;
  bbox?: string;
}

/**
 * Error response for signal operations
 */
export interface SignalError {
  detail: string;
  status_code?: number;
}
