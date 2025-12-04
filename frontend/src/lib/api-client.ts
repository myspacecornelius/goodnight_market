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

export interface LacesTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  related_post_id?: string;
  created_at: string;
}

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

    const response = await this.client.post<AuthTokens>('/auth/token', formData, {
      headers: {
        // Override default JSON header so FastAPI treats this as form data
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.setAuthToken(response.data.access_token);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
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

  // LACES methods
  async getLacesBalance(): Promise<number> {
    const user = await this.getCurrentUser();
    return user.laces_balance;
  }

  async getLacesTransactions(skip: number = 0, limit: number = 50): Promise<LacesTransaction[]> {
    // This endpoint would need to be implemented in the backend
    try {
      const response = await this.client.get<LacesTransaction[]>('/laces/transactions', {
        params: { skip, limit },
      });
      return response.data;
    } catch {
      // Return empty array if endpoint doesn't exist yet
      return [];
    }
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

  async saveListing(listingId: string): Promise<void> {
    await this.client.post(`/v2/listings/${listingId}/save`);
  }

  async unsaveListing(listingId: string): Promise<void> {
    await this.client.delete(`/v2/listings/${listingId}/save`);
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
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
