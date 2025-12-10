/**
 * Drop Zones Types
 * 
 * TypeScript definitions for the Drop Zones feature - physical locations where
 * users can check in, earn points, and participate in community events.
 * Matches backend schemas in services/routers/dropzones_ext.py
 */

/**
 * Drop zone status
 */
export type DropZoneStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

/**
 * Member role in a drop zone
 */
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * RSVP status for a drop zone
 */
export type RSVPStatus = 'going' | 'interested' | 'not_going';

/**
 * Drop Zone entity
 * Response from GET /v1/dropzones and GET /v1/dropzones/{id}
 */
export interface DropZone {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  status: DropZoneStatus;
  starts_at?: string;  // ISO datetime
  ends_at?: string;    // ISO datetime
  member_count: number;
  check_in_count: number;
  created_at: string;  // ISO datetime
}

/**
 * Detailed drop zone information
 * Response from GET /v1/dropzones/{id}
 */
export interface DropZoneDetails extends DropZone {
  check_in_radius: number;
  rules?: string;
  tags?: string[];
  is_public: boolean;
  stats: {
    member_count: number;
    total_checkins: number;
    today_checkins: number;
  };
  recent_checkins: RecentCheckIn[];
}

/**
 * Request to create a new drop zone
 * POST /v1/dropzones
 */
export interface DropZoneCreate {
  name: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters?: number;      // Default: 100m
  check_in_radius?: number;    // Default: 50m
  starts_at?: string;          // ISO datetime
  ends_at?: string;            // ISO datetime
  max_capacity?: number;
  rules?: string;
  tags?: string[];
  is_public?: boolean;        // Default: true
}

/**
 * Parameters for listing drop zones
 * GET /v1/dropzones
 */
export interface ListDropZonesParams {
  bbox?: string;              // "min_lng,min_lat,max_lng,max_lat"
  active?: boolean;           // Filter to active only
  limit?: number;             // Max 100, default 50
  offset?: number;
}

/**
 * Check-in request
 * POST /v1/dropzones/{id}/checkin
 */
export interface CheckInRequest {
  lat: number;
  lng: number;
  message?: string;
  photo_url?: string;
}

/**
 * Check-in response
 * Response from POST /v1/dropzones/{id}/checkin
 */
export interface CheckInResponse {
  success: boolean;
  check_in_id: string;
  distance_from_center: number;  // In meters
  streak_count: number;          // Consecutive days
  points_earned: number;         // LACES earned
  message: string;
}

/**
 * Recent check-in summary
 * Included in DropZoneDetails
 */
export interface RecentCheckIn {
  id: string;
  user_id: string;
  message?: string;
  streak_count: number;
  points_earned: number;
  checked_in_at: string;  // ISO datetime
}

/**
 * Drop zone member
 */
export interface DropZoneMember {
  id: string;
  dropzone_id: string;
  user_id: string;
  role: MemberRole;
  rsvp_status: RSVPStatus;
  joined_at: string;  // ISO datetime
}

/**
 * User's check-in history for a drop zone
 */
export interface CheckInHistory {
  id: string;
  dropzone_id: string;
  user_id: string;
  check_in_location: {
    lat: number;
    lng: number;
  };
  distance_from_center: number;
  message?: string;
  photo_url?: string;
  streak_count: number;
  points_earned: number;
  checked_in_at: string;
}

/**
 * Geolocation for check-in
 * Helper type for browser geolocation
 */
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Drop zone with distance from user
 * Helper type for displaying nearby drop zones
 */
export interface DropZoneWithDistance extends DropZone {
  distance_miles?: number;
  distance_meters?: number;
}

/**
 * Join drop zone response
 * Response from POST /v1/dropzones/{id}/join
 */
export interface JoinDropZoneResponse {
  success: boolean;
  message: string;
}

/**
 * Error response for check-in failures
 */
export interface CheckInError {
  detail: string;
  distance?: number;
  required_distance?: number;
}
