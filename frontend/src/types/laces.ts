/**
 * LACES Token Economy Types
 * 
 * Complete TypeScript definitions for the LACES (Local Actions Community Engagement System)
 * token economy. These types match the backend Python schemas in services/routers/laces.py
 */

/**
 * All possible transaction types in the LACES economy
 * Matches the TransactionType enum in services/models/laces.py
 */
export type TransactionType =
  // Earning types (positive amounts)
  | 'DAILY_STIPEND'        // Daily allowance (100 LACES)
  | 'POST_REWARD'          // Creating quality posts (5-25 LACES)
  | 'CHECKIN_REWARD'       // Drop zone check-ins (10-30 LACES with streak bonus)
  | 'BOOST_RECEIVED'       // Someone boosted your post (50% of boost)
  | 'SIGNAL_REWARD'        // High-quality location signals
  | 'CONTEST_REWARD'       // Community contests
  | 'ADMIN_ADD'            // Manual admin grant
  | 'REFUND'               // Refund from purchase
  // Spending types (negative amounts)
  | 'BOOST_SENT'           // Boosting others' posts
  | 'PURCHASE'             // Buying items/features
  | 'CHECKOUT_TASK_PURCHASE' // Purchasing checkout tasks
  | 'ADMIN_REMOVE';        // Manual admin deduction

/**
 * Complete balance information for a user
 * Response from GET /v1/laces/balance
 */
export interface LacesBalance {
  balance: number;
  user_id: string;
  last_stipend: string | null;  // ISO datetime of last stipend claim
  total_earned: number;         // Lifetime earnings
  total_spent: number;          // Lifetime spending (absolute value)
}

/**
 * Single transaction in the LACES ledger
 * Represents one entry in a user's transaction history
 */
export interface LacesTransaction {
  id: string;
  amount: number;                    // Positive for earnings, negative for spending
  transaction_type: TransactionType;
  related_post_id?: string;         // Optional link to post/signal
  created_at: string;               // ISO datetime
  description?: string;             // Human-readable description
}

/**
 * Paginated ledger response
 * Response from GET /v1/laces/ledger
 */
export interface LacesLedgerResponse {
  transactions: LacesTransaction[];
  total_count: number;
  page: number;
  limit: number;
}

/**
 * Parameters for fetching ledger history
 */
export interface LacesLedgerParams {
  page?: number;
  limit?: number;
  transaction_type?: TransactionType;
}

/**
 * A single earning opportunity available to the user
 */
export interface EarningOpportunity {
  type: string;                  // Opportunity identifier
  reward: number | string;       // Amount or range (e.g., "10-30")
  description: string;           // User-friendly description
}

/**
 * All available earning opportunities for a user
 * Response from GET /v1/laces/opportunities
 */
export interface EarningOpportunitiesResponse {
  opportunities: EarningOpportunity[];
  daily_stipend_claimed: boolean;
  posts_today: number;
  checkins_today: number;
}

/**
 * Response from claiming daily stipend
 * POST /v1/laces/daily-stipend
 */
export interface ClaimStipendResponse {
  transaction_id: string;
  new_balance: number;
  amount: number;
  transaction_type: 'DAILY_STIPEND';
  message: string;
}

/**
 * Response from boosting a post with LACES
 * POST /v1/laces/boost-post/{post_id}
 */
export interface BoostPostResponse {
  success: boolean;
  boost_amount: number;
  author_reward: number;
  new_boost_score: number;
  remaining_balance: number;
}

/**
 * Request body for admin LACES grant
 * POST /v1/laces/grant (admin only)
 */
export interface GrantLacesRequest {
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  related_post_id?: string;
  description?: string;
}

/**
 * Response from granting LACES
 */
export interface GrantLacesResponse {
  transaction_id: string;
  new_balance: number;
  amount: number;
  transaction_type: TransactionType;
}
