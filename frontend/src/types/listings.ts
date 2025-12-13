/**
 * Listings Types
 * 
 * TypeScript definitions for the marketplace listing system.
 * Covers creation, updates, CRUD operations, and listing management.
 * Matches backend schemas in services/schemas/listing.py
 */

/**
 * Condition enum for listing items
 */
export type Condition = 'DS' | 'VNDS' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'BEAT';

/**
 * Size type categories
 */
export type SizeType = 'MENS' | 'WOMENS' | 'GS' | 'PS' | 'TD' | 'UNISEX';

/**
 * Trade intent options
 */
export type TradeIntent = 'SALE' | 'TRADE' | 'BOTH';

/**
 * Listing status
 */
export type ListingStatus = 'ACTIVE' | 'PENDING' | 'SOLD' | 'TRADED' | 'EXPIRED' | 'DELETED';

/**
 * Listing visibility settings
 */
export type ListingVisibility = 'public' | 'local' | 'followers' | 'private';

/**
 * Request to create a new listing
 * POST /v2/listings
 */
export interface ListingCreate {
  // Basic info
  title: string;                      // 3-200 chars
  description?: string;               // Max 2000 chars
  brand: string;                      // Required
  sku?: string;
  colorway?: string;
  size: string;                       // Required
  size_type?: SizeType;               // Default: MENS
  
  // Condition
  condition: Condition;               // Required
  condition_notes?: string;           // Max 500 chars
  has_box?: boolean;                  // Default: true
  has_extras?: boolean;               // Default: false
  
  // Media
  images: string[];                   // 1-10 images required
  authenticity_photos?: string[];     // 0-5 photos
  
  // Pricing & Trade
  price?: number;                     // Required if trade_intent is SALE
  trade_intent?: TradeIntent;         // Default: SALE
  trade_interests?: string[];         // Max 10 items
  trade_notes?: string;               // Max 500 chars
  
  // Location (required for hyperlocal)
  latitude: number;                   // -90 to 90
  longitude: number;                  // -180 to 180
  
  // Settings
  visibility?: ListingVisibility;     // Default: public
}

/**
 * Request to update an existing listing
 * PUT /v2/listings/{id} (if implemented)
 */
export interface ListingUpdate {
  title?: string;
  description?: string;
  condition_notes?: string;
  images?: string[];
  authenticity_photos?: string[];
  price?: number;
  trade_intent?: TradeIntent;
  trade_interests?: string[];
  trade_notes?: string;
  visibility?: ListingVisibility;
}

/**
 * Request to drop listing price
 * POST /v2/listings/{id}/price-drop
 */
export interface PriceDropRequest {
  new_price: number;
}

/**
 * Response for price drop
 */
export interface PriceDropResponse {
  message: string;
  old_price: number;
  new_price: number;
  drop_percent: number;
}

/**
 * Response for marking listing as sold
 */
export interface MarkSoldResponse {
  message: string;
  status: ListingStatus;
}

/**
 * Response for save/unsave operations
 */
export interface SaveResponse {
  message: string;
  save_count: number;
}

/**
 * Full listing response with all details
 * Response from GET /v2/listings/{id} and POST /v2/listings
 */
export interface ListingResponse {
  id: string;
  user_id: string;
  
  // Basic info
  title: string;
  description?: string;
  brand: string;
  sku?: string;
  colorway?: string;
  size: string;
  size_type: string;
  
  // Condition
  condition: string;
  condition_notes?: string;
  has_box: boolean;
  has_extras: boolean;
  
  // Media
  images: string[];
  authenticity_photos?: string[];
  authenticity_score: number;
  is_verified: boolean;
  
  // Pricing & Trade
  price?: number;
  original_price?: number;
  price_drop_percent: number;
  trade_intent: string;
  trade_interests?: string[];
  trade_notes?: string;
  
  // Location & Stats
  h3_index: string;
  view_count: number;
  save_count: number;
  message_count: number;
  
  // Status
  status: string;
  visibility: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}

/**
 * Listing parameters for user's own listings
 */
export interface MyListingsParams {
  status?: ListingStatus;
  limit?: number;
  offset?: number;
}

/**
 * Response for user's listings
 */
export interface MyListingsResponse {
  listings: ListingResponse[];
  total_count: number;
}

/**
 * Helper type for listing form data
 * Used in UI forms before submission
 */
export interface ListingFormData extends Omit<ListingCreate, 'latitude' | 'longitude'> {
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

/**
 * Listing validation errors
 */
export interface ListingValidationError {
  field: string;
  message: string;
}

/**
 * Condition labels for display
 */
export const CONDITION_LABELS: Record<Condition, string> = {
  DS: 'Deadstock (New)',
  VNDS: 'Very Near Deadstock',
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  BEAT: 'Beat/Used',
};

/**
 * Condition descriptions
 */
export const CONDITION_DESCRIPTIONS: Record<Condition, string> = {
  DS: 'Brand new, never worn, with all original packaging',
  VNDS: 'Tried on once or worn 1-2 times, like new condition',
  EXCELLENT: 'Lightly worn, minimal signs of wear',
  GOOD: 'Worn several times, moderate wear visible',
  FAIR: 'Well-worn, noticeable wear and tear',
  BEAT: 'Heavily worn, significant wear and damage',
};

/**
 * Size type labels
 */
export const SIZE_TYPE_LABELS: Record<SizeType, string> = {
  MENS: "Men's",
  WOMENS: "Women's",
  GS: 'Grade School',
  PS: 'Preschool',
  TD: 'Toddler',
  UNISEX: 'Unisex',
};

/**
 * Trade intent labels
 */
export const TRADE_INTENT_LABELS: Record<TradeIntent, string> = {
  SALE: 'For Sale Only',
  TRADE: 'Trade Only',
  BOTH: 'Sale or Trade',
};

/**
 * Image upload configuration
 */
export interface ImageUploadConfig {
  maxSizeBytes: number;
  maxFiles: number;
  acceptedFormats: string[];
  minDimensions?: { width: number; height: number };
}

export const LISTING_IMAGE_CONFIG: ImageUploadConfig = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  minDimensions: { width: 600, height: 600 },
};

export const AUTHENTICITY_IMAGE_CONFIG: ImageUploadConfig = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  acceptedFormats: ['image/jpeg', 'image/png'],
  minDimensions: { width: 800, height: 800 },
};

/**
 * Helper to validate listing creation data
 */
export function validateListingCreate(data: Partial<ListingCreate>): ListingValidationError[] {
  const errors: ListingValidationError[] = [];
  
  if (!data.title || data.title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
  }
  
  if (!data.brand) {
    errors.push({ field: 'brand', message: 'Brand is required' });
  }
  
  if (!data.size) {
    errors.push({ field: 'size', message: 'Size is required' });
  }
  
  if (!data.condition) {
    errors.push({ field: 'condition', message: 'Condition is required' });
  }
  
  if (!data.images || data.images.length === 0) {
    errors.push({ field: 'images', message: 'At least one image is required' });
  }
  
  if (data.trade_intent === 'SALE' && (data.price === undefined || data.price === null)) {
    errors.push({ field: 'price', message: 'Price is required for sale listings' });
  }
  
  if (data.latitude === undefined || data.longitude === undefined) {
    errors.push({ field: 'location', message: 'Location is required' });
  }
  
  return errors;
}
