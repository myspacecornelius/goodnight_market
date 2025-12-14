import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AuthTokens {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface User {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  laces_balance: number;
  is_verified: boolean;
  created_at: string;
}

export interface Post {
  post_id: string;
  user_id: string;
  content_text?: string;
  media_url?: string;
  tags?: string[];
  boost_score: number;
  timestamp: string;
  visibility: 'public' | 'local' | 'friends' | 'private';
  post_type: 'SPOTTED' | 'STOCK_CHECK' | 'LINE_UPDATE' | 'GENERAL' | 'HEAT_CHECK' | 'INTEL_REPORT';
}

export interface CreatePostData {
  post_type: Post['post_type'];
  content_text?: string;
  media_url?: string;
  tags?: string[];
  geo_tag_lat?: number;
  geo_tag_long?: number;
  visibility?: Post['visibility'];
}

export interface HyperlocalSignal {
  latitude: number;
  longitude: number;
  radius?: number;
}

// Import LACES types from dedicated file
import type {
  LacesBalance,
  LacesTransaction,
  LacesLedgerResponse,
  LacesLedgerParams,
  EarningOpportunitiesResponse,
  ClaimStipendResponse,
  BoostPostResponse,
  GrantLacesRequest,
  GrantLacesResponse,
} from '../types/laces';

// Import Drop Zones types
import type {
  DropZone,
  DropZoneDetails,
  DropZoneCreate,
  ListDropZonesParams,
  CheckInRequest,
  CheckInResponse,
  JoinDropZoneResponse,
} from '../types/dropzones';

// Import Signals types
import type {
  Signal,
  SignalCreate,
  SignalList,
  ListSignalsParams,
  SignalHeatmap,
  HeatmapParams,
  SignalStats,
  BoostSignalResponse,
} from '../types/signals';

// Import Listings types
import type {
  ListingCreate,
  ListingUpdate,
  ListingResponse,
  PriceDropRequest,
  PriceDropResponse,
  MarkSoldResponse,
  SaveResponse,
} from '../types/listings';

// ============================================
// MARKETPLACE / FEED V2 TYPES
// ============================================

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  brand: string;
  sku?: string;
  colorway?: string;
  size: string;
  size_type: string;
  condition: 'DS' | 'VNDS' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'BEAT';
  condition_notes?: string;
  has_box: boolean;
  has_extras: boolean;
  images: string[];
  authenticity_photos?: string[];
  authenticity_score: number;
  is_verified: boolean;
  price?: number;
  original_price?: number;
  price_drop_percent: number;
  trade_intent: 'SALE' | 'TRADE' | 'BOTH';
  trade_interests?: string[];
  trade_notes?: string;
  h3_index: string;
  distance_miles?: number;
  rank_score: number;
  demand_score: number;
  view_count: number;
  save_count: number;
  message_count: number;
  status: string;
  visibility: string;
  created_at: string;
  updated_at?: string;
}

export interface HyperlocalFeedResponse {
  listings: Listing[];
  total_count: number;
  radius_miles: number;
  center_h3: string;
  heat_level: 'cold' | 'warm' | 'hot' | 'fire';
}

export interface HeatIndexResponse {
  h3_index: string;
  lat: number;
  lng: number;
  heat_score: number;
  heat_level: string;
  velocities: {
    save_velocity: number;
    dm_velocity: number;
    listing_velocity: number;
  };
  volume: {
    active_listings: number;
    active_users: number;
  };
  trending: {
    brands: Array<{ brand: string; score: number }>;
    skus: Array<{ sku: string; name: string; score: number }>;
  };
  price: {
    avg_listing_price?: number;
    price_trend?: string;
  };
  window_hours: number;
  updated_at?: string;
}

export interface ActivityRibbonItem {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  display_text?: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface ActivityRibbonResponse {
  events: ActivityRibbonItem[];
  has_more: boolean;
}

export interface TradeMatchItem {
  listing_id: string;
  title: string;
  image?: string;
  size?: string;
  brand?: string;
  condition?: string;
}

export interface TradeMatch {
  id: string;
  match_type: 'TWO_WAY' | 'THREE_WAY';
  you_offer: TradeMatchItem;
  you_receive: TradeMatchItem;
  other_parties: number;
  locality_score: number;
  match_score: number;
  status: string;
  your_acceptance?: { accepted: boolean; at?: string };
  created_at: string;
}

export interface TradeMatchListResponse {
  matches: TradeMatch[];
  total_count: number;
}

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for the refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAuthToken();
            if (newToken) {
              // Notify all waiting requests
              this.refreshSubscribers.forEach((callback) => callback(newToken));
              this.refreshSubscribers = [];
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearAuthToken();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.warn(`Rate limited. Retry after ${retryAfter}s`);
        }

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAuthToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<AuthTokens>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { access_token, refresh_token } = response.data;
      this.setAuthToken(access_token);
      if (refresh_token) {
        this.setRefreshToken(refresh_token);
      }
      return access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  private setRefreshToken(token: string) {
    this.refreshToken = token;
    localStorage.setItem('refresh_token', token);
  }

  private getRefreshToken(): string | null {
    if (!this.refreshToken) {
      this.refreshToken = localStorage.getItem('refresh_token');
    }
    return this.refreshToken;
  }

  private clearRefreshToken() {
    this.refreshToken = null;
    localStorage.removeItem('refresh_token');
  }

  // Auth methods
  async login(username: string, password: string): Promise<AuthTokens> {
    const formData = new URLSearchParams();
    formData.set('username', username);
    formData.set('password', password);
    formData.set('grant_type', 'password');

    try {
      const response = await this.client.post<AuthTokens>('/auth/token', formData, {
        headers: {
          // Override default JSON header so FastAPI treats this as form data
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.setAuthToken(response.data.access_token);
      return response.data;
    } catch (error: any) {
      // Enhanced error handling for common login issues
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        // Handle backend not running
        console.warn('Backend service not available. Using mock login for development.');

        // For demo purposes, allow login with known demo credentials
        const demoCredentials = [
          { username: 'boston_kicks_og', password: 'dharma2024' },
          { username: 'nyc_heat_hunter', password: 'dharma2024' },
          { username: 'la_streetwear_king', password: 'dharma2024' },
          { username: 'dharma2024', password: 'dharma2024' }
        ];

        const isDemoUser = demoCredentials.some(
          cred => cred.username === username && cred.password === password
        );

        if (isDemoUser) {
          // Create a mock token for development
          const mockToken = {
            access_token: 'mock_access_token_for_' + username,
            token_type: 'bearer',
            expires_in: 3600
          };

          this.setAuthToken(mockToken.access_token);
          return mockToken;
        } else {
          throw new Error('Backend service not available. Please use demo credentials or start the backend service.');
        }
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.client.get<User>('/auth/me');
      return response.data;
    } catch (error: any) {
      // Handle backend not running - return mock user data for development
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.warn('Backend service not available. Using mock user data for development.');

        const token = this.getAuthToken();
        if (token && token.startsWith('mock_access_token_for_')) {
          const username = token.replace('mock_access_token_for_', '');
          return {
            user_id: 'mock_user_id_' + username,
            username: username,
            display_name: username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: username + '@dharma.community',
            avatar_url: `https://images.unsplash.com/photo-1500000000?w=400`,
            bio: 'Sneaker enthusiast and Dharma community member',
            location: 'Boston, MA',
            laces_balance: 1000,
            is_verified: true,
            created_at: new Date().toISOString()
          };
        }
      }
      throw error;
    }
  }

  // Post methods
  async createPost(data: CreatePostData): Promise<Post> {
    const response = await this.client.post<Post>('/posts/', data);
    return response.data;
  }

  async getUserFeed(skip: number = 0, limit: number = 20): Promise<Post[]> {
    const response = await this.client.get<Post[]>('/posts/feed', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getGlobalFeed(skip: number = 0, limit: number = 10): Promise<Post[]> {
    const response = await this.client.get<Post[]>('/posts/global', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    const response = await this.client.get<Post[]>(`/posts/user/${userId}`);
    return response.data;
  }

  async deletePost(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}`);
  }

  // Signal methods (hyperlocal)
  async createHyperlocalSignal(data: CreatePostData): Promise<Post> {
    const response = await this.client.post<Post>('/v1/signals', data);
    return response.data;
  }

  async getHyperlocalFeed(signal: HyperlocalSignal): Promise<Post[]> {
    const response = await this.client.get<Post[]>('/v1/feed/scan', {
      params: {
        latitude: signal.latitude,
        longitude: signal.longitude,
        radius: signal.radius || 1.0,
      },
    });
    return response.data;
  }

  async boostPost(postId: string): Promise<User> {
    const response = await this.client.post<User>(`/v1/signals/${postId}/boost`);
    return response.data;
  }

  // User methods
  async getUsers(skip: number = 0, limit: number = 50): Promise<User[]> {
    const response = await this.client.get<User[]>('/users/', {
      params: { skip, limit },
    });
    return response.data;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await this.client.put<User>(`/users/${userId}`, data);
    return response.data;
  }

  // ============================================
  // LACES TOKEN ECONOMY
  // ============================================

  /**
   * Get complete LACES balance information for current user
   * Includes balance, lifetime earnings/spending, and last stipend date
   */
  async getLacesBalance(): Promise<LacesBalance> {
    const response = await this.client.get<LacesBalance>('/v1/laces/balance');
    return response.data;
  }

  /**
   * Get paginated transaction history for current user
   * @param params - Pagination and filter options
   */
  async getLacesLedger(params: LacesLedgerParams = {}): Promise<LacesLedgerResponse> {
    const response = await this.client.get<LacesLedgerResponse>('/v1/laces/ledger', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        transaction_type: params.transaction_type,
      },
    });
    return response.data;
  }

  /**
   * Get available earning opportunities for current user
   * Shows what actions they can take to earn LACES
   */
  async getEarningOpportunities(): Promise<EarningOpportunitiesResponse> {
    const response = await this.client.get<EarningOpportunitiesResponse>(
      '/v1/laces/opportunities'
    );
    return response.data;
  }

  /**
   * Claim daily LACES stipend (100 LACES)
   * Can only be claimed once per 24 hours
   */
  async claimDailyStipend(): Promise<ClaimStipendResponse> {
    const response = await this.client.post<ClaimStipendResponse>(
      '/v1/laces/daily-stipend'
    );
    return response.data;
  }

  /**
   * Boost a post using LACES tokens
   * @param postId - ID of the post to boost
   * @param boostAmount - Amount of LACES to spend (1-100)
   * @returns Boost details including author reward
   */
  async boostPostWithLaces(
    postId: string,
    boostAmount: number = 10
  ): Promise<BoostPostResponse> {
    const response = await this.client.post<BoostPostResponse>(
      `/v1/laces/boost-post/${postId}`,
      null,
      { params: { boost_amount: boostAmount } }
    );
    return response.data;
  }

  /**
   * Grant LACES to a user (admin only)
   * @param request - Grant details including user, amount, and type
   */
  async grantLaces(request: GrantLacesRequest): Promise<GrantLacesResponse> {
    const response = await this.client.post<GrantLacesResponse>(
      '/v1/laces/grant',
      request
    );
    return response.data;
  }

  /**
   * Legacy method - use getLacesBalance() instead
   * @deprecated Use getLacesBalance() for full balance info
   */
  async getLacesBalanceSimple(): Promise<number> {
    const balance = await this.getLacesBalance();
    return balance.balance;
  }

  // ============================================
  // DROP ZONES
  // ============================================

  /**
   * List drop zones with optional filtering
   * @param params - Bounding box, active status, pagination
   */
  async listDropZones(params: ListDropZonesParams = {}): Promise<DropZone[]> {
    const response = await this.client.get<DropZone[]>('/v1/dropzones', { params });
    return response.data;
  }

  /**
   * Get detailed information about a specific drop zone
   * Includes stats and recent check-ins
   */
  async getDropZoneDetails(dropzoneId: string): Promise<DropZoneDetails> {
    const response = await this.client.get<DropZoneDetails>(`/v1/dropzones/${dropzoneId}`);
    return response.data;
  }

  /**
   * Create a new drop zone
   * User becomes the owner automatically
   */
  async createDropZone(data: DropZoneCreate): Promise<DropZone> {
    const response = await this.client.post<DropZone>('/v1/dropzones', data);
    return response.data;
  }

  /**
   * Check in to a drop zone
   * Verifies location and awards LACES based on streak
   * @param dropzoneId - ID of the drop zone
   * @param data - User's current location and optional message/photo
   */
  async checkInToDropZone(
    dropzoneId: string,
    data: CheckInRequest
  ): Promise<CheckInResponse> {
    const response = await this.client.post<CheckInResponse>(
      `/v1/dropzones/${dropzoneId}/checkin`,
      data
    );
    return response.data;
  }

  /**
   * Join a drop zone as a member
   */
  async joinDropZone(dropzoneId: string): Promise<JoinDropZoneResponse> {
    const response = await this.client.post<JoinDropZoneResponse>(
      `/v1/dropzones/${dropzoneId}/join`
    );
    return response.data;
  }

  // ============================================
  // ENHANCED SIGNALS
  // ============================================

  /**
   * Create a new signal
   * @param data - Signal data including location, type, and content
   */
  async createSignal(data: SignalCreate): Promise<Signal> {
    const response = await this.client.post<Signal>('/signals/', data);
    return response.data;
  }

  /**
   * List signals with filtering and pagination
   * @param params - Filtering options (bbox, city, signal_type, etc.)
   */
  async listSignals(params: ListSignalsParams = {}): Promise<SignalList> {
    const response = await this.client.get<SignalList>('/signals/', { params });
    return response.data;
  }

  /**
   * Get signal heatmap data
   * Shows aggregated signals in geohash buckets
   * @param params - Bounding box, zoom level, time window
   */
  async getSignalHeatmap(params: HeatmapParams = {}): Promise<SignalHeatmap> {
    const response = await this.client.get<SignalHeatmap>('/signals/heatmap', { params });
    return response.data;
  }

  /**
   * Get signal statistics
   * @param timeWindow - Time window for stats (1h, 24h, 7d)
   */
  async getSignalStats(timeWindow: string = '24h'): Promise<SignalStats> {
    const response = await this.client.get<SignalStats>('/signals/stats', {
      params: { time_window: timeWindow }
    });
    return response.data;
  }

  /**
   * Boost a signal (like/upvote)
   * @param signalId - ID of the signal to boost
   */
  async boostSignal(signalId: string): Promise<BoostSignalResponse> {
    const response = await this.client.post<BoostSignalResponse>(`/signals/${signalId}/boost`);
    return response.data;
  }

  // Release methods
  async getReleases(skip: number = 0, limit: number = 50) {
    const response = await this.client.get('/releases/', {
      params: { skip, limit },
    });
    return response.data;
  }

  async createRelease(data: any) {
    const response = await this.client.post('/releases/', data);
    return response.data;
  }

  // ============================================
  // MARKETPLACE / FEED V2
  // ============================================

  // Listing types
  async getHyperlocalListings(params: {
    lat: number;
    lng: number;
    radius?: number;
    brand?: string;
    size?: string;
    condition?: string;
    trade_intent?: string;
    min_price?: number;
    max_price?: number;
    sort_by?: 'rank' | 'price' | 'newest' | 'distance';
    limit?: number;
    offset?: number;
  }): Promise<HyperlocalFeedResponse> {
    const response = await this.client.get<HyperlocalFeedResponse>('/v2/feed/hyperlocal', {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 3.0,
        brand: params.brand,
        size: params.size,
        condition: params.condition,
        trade_intent: params.trade_intent,
        min_price: params.min_price,
        max_price: params.max_price,
        sort_by: params.sort_by || 'rank',
        limit: params.limit || 50,
        offset: params.offset || 0,
      },
    });
    return response.data;
  }

  async getNeighborhoodHeat(lat: number, lng: number): Promise<HeatIndexResponse> {
    const response = await this.client.get<HeatIndexResponse>('/v2/feed/heat-index', {
      params: { lat, lng },
    });
    return response.data;
  }

  async getActivityRibbon(lat: number, lng: number, radius: number = 3.0): Promise<ActivityRibbonResponse> {
    const response = await this.client.get<ActivityRibbonResponse>('/v2/feed/activity-ribbon', {
      params: { lat, lng, radius },
    });
    return response.data;
  }

  async getTradeMatches(): Promise<TradeMatchListResponse> {
    const response = await this.client.get<TradeMatchListResponse>('/v2/feed/trade-matches');
    return response.data;
  }

  async acceptTradeMatch(matchId: string): Promise<void> {
    await this.client.post(`/v2/feed/trade-matches/${matchId}/accept`);
  }

  async declineTradeMatch(matchId: string): Promise<void> {
    await this.client.post(`/v2/feed/trade-matches/${matchId}/decline`);
  }

  async getListing(listingId: string): Promise<Listing> {
    const response = await this.client.get<Listing>(`/v2/listings/${listingId}`);
    return response.data;
  }

  async saveListing(listingId: string): Promise<SaveResponse> {
    const response = await this.client.post<SaveResponse>(`/v2/listings/${listingId}/save`);
    return response.data;
  }

  async unsaveListing(listingId: string): Promise<void> {
    await this.client.delete(`/v2/listings/${listingId}/save`);
  }

  /**
   * Create a new marketplace listing
   * @param data - Listing creation data
   */
  async createListing(data: ListingCreate): Promise<ListingResponse> {
    const response = await this.client.post<ListingResponse>('/v2/listings', data);
    return response.data;
  }

  /**
   * Update an existing listing
   * @param listingId - ID of the listing to update
   * @param data - Updated listing data
   */
  async updateListing(listingId: string, data: ListingUpdate): Promise<ListingResponse> {
    const response = await this.client.put<ListingResponse>(`/v2/listings/${listingId}`, data);
    return response.data;
  }

  /**
   * Drop the price of a listing
   * @param listingId - ID of the listing
   * @param data - New price information
   */
  async dropListingPrice(listingId: string, data: PriceDropRequest): Promise<PriceDropResponse> {
    const response = await this.client.post<PriceDropResponse>(
      `/v2/listings/${listingId}/price-drop`,
      data
    );
    return response.data;
  }

  /**
   * Mark a listing as sold
   * @param listingId - ID of the listing
   */
  async markListingSold(listingId: string): Promise<MarkSoldResponse> {
    const response = await this.client.post<MarkSoldResponse>(`/v2/listings/${listingId}/sold`);
    return response.data;
  }

  /**
   * Delete a listing
   * @param listingId - ID of the listing to delete
   */
  async deleteListing(listingId: string): Promise<void> {
    await this.client.delete(`/v2/listings/${listingId}`);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return { healthy: true, data: response.data };
    } catch (error) {
      return { healthy: false, error };
    }
  }

  // Token management
  private setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
  }

  private getAuthToken(): string | null {
    if (!this.authToken) {
      this.authToken = localStorage.getItem('auth_token');
    }
    return this.authToken;
  }

  private clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  logout() {
    this.clearAuthToken();
    this.clearRefreshToken();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
