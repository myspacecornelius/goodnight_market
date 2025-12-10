/**
 * LACES Token Economy React Hooks
 * 
 * Custom hooks for interacting with the LACES token system.
 * Uses React Query for caching, background updates, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  LacesBalance,
  LacesLedgerResponse,
  LacesLedgerParams,
  EarningOpportunitiesResponse,
  ClaimStipendResponse,
  BoostPostResponse,
  TransactionType,
} from '@/types/laces';
import { toast } from 'sonner';

// Query keys for React Query cache management
export const lacesKeys = {
  all: ['laces'] as const,
  balance: () => [...lacesKeys.all, 'balance'] as const,
  ledger: (params?: LacesLedgerParams) => [...lacesKeys.all, 'ledger', params] as const,
  opportunities: () => [...lacesKeys.all, 'opportunities'] as const,
};

/**
 * Fetch current user's LACES balance with lifetime stats
 * 
 * @example
 * ```tsx
 * const { data: balance, isLoading } = useLacesBalance();
 * if (balance) {
 *   console.log(`Balance: ${balance.balance} LACES`);
 *   console.log(`Earned: ${balance.total_earned}, Spent: ${balance.total_spent}`);
 * }
 * ```
 */
export function useLacesBalance(options?: Omit<UseQueryOptions<LacesBalance>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: lacesKeys.balance(),
    queryFn: () => apiClient.getLacesBalance(),
    staleTime: 30000, // 30 seconds - balance changes frequently
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Fetch paginated transaction history
 * 
 * @param params - Pagination and filter options
 * @example
 * ```tsx
 * const { data: ledger } = useLacesLedger({ page: 1, limit: 20 });
 * const earnings = useLacesLedger({ transaction_type: 'DAILY_STIPEND' });
 * ```
 */
export function useLacesLedger(
  params: LacesLedgerParams = {},
  options?: Omit<UseQueryOptions<LacesLedgerResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lacesKeys.ledger(params),
    queryFn: () => apiClient.getLacesLedger(params),
    staleTime: 60000, // 1 minute - history doesn't change as often
    ...options,
  });
}

/**
 * Fetch available earning opportunities for the user
 * Shows what actions they can take to earn LACES today
 * 
 * @example
 * ```tsx
 * const { data: opportunities } = useEarningOpportunities();
 * opportunities?.opportunities.map(opp => (
 *   <div key={opp.type}>{opp.description} - {opp.reward} LACES</div>
 * ));
 * ```
 */
export function useEarningOpportunities(
  options?: Omit<UseQueryOptions<EarningOpportunitiesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: lacesKeys.opportunities(),
    queryFn: () => apiClient.getEarningOpportunities(),
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Claim daily LACES stipend (100 LACES)
 * Automatically invalidates balance and opportunities on success
 * 
 * @example
 * ```tsx
 * const claimStipend = useClaimStipend();
 * 
 * <Button 
 *   onClick={() => claimStipend.mutate()}
 *   disabled={claimStipend.isPending}
 * >
 *   Claim Daily Stipend
 * </Button>
 * ```
 */
export function useClaimStipend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.claimDailyStipend(),
    
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: lacesKeys.balance() });
      
      // Optimistically update balance
      const previousBalance = queryClient.getQueryData<LacesBalance>(lacesKeys.balance());
      
      if (previousBalance) {
        queryClient.setQueryData<LacesBalance>(lacesKeys.balance(), {
          ...previousBalance,
          balance: previousBalance.balance + 100,
          total_earned: previousBalance.total_earned + 100,
          last_stipend: new Date().toISOString(),
        });
      }
      
      return { previousBalance };
    },
    
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: lacesKeys.all });
      toast.success(data.message, {
        description: `+${data.amount} LACES added to your balance`,
        duration: 4000,
      });
    },
    
    onError: (error: any, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousBalance) {
        queryClient.setQueryData(lacesKeys.balance(), context.previousBalance);
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to claim stipend';
      toast.error('Claim Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

/**
 * Boost a post using LACES tokens
 * Deducts LACES from user and rewards the post author
 * 
 * @example
 * ```tsx
 * const boostPost = useBoostPostWithLaces();
 * 
 * <Button onClick={() => boostPost.mutate({ postId: '123', amount: 25 })}>
 *   Boost with 25 LACES
 * </Button>
 * ```
 */
export function useBoostPostWithLaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, amount }: { postId: string; amount: number }) =>
      apiClient.boostPostWithLaces(postId, amount),
    
    onMutate: async ({ amount }) => {
      // Optimistically update balance
      await queryClient.cancelQueries({ queryKey: lacesKeys.balance() });
      
      const previousBalance = queryClient.getQueryData<LacesBalance>(lacesKeys.balance());
      
      if (previousBalance) {
        queryClient.setQueryData<LacesBalance>(lacesKeys.balance(), {
          ...previousBalance,
          balance: previousBalance.balance - amount,
          total_spent: previousBalance.total_spent + amount,
        });
      }
      
      return { previousBalance };
    },
    
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: lacesKeys.all });
      
      toast.success('Post Boosted!', {
        description: `Spent ${variables.amount} LACES. Author received ${data.author_reward} LACES.`,
        duration: 4000,
      });
    },
    
    onError: (error: any, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousBalance) {
        queryClient.setQueryData(lacesKeys.balance(), context.previousBalance);
      }
      
      const errorMessage = error.response?.data?.detail || 'Failed to boost post';
      toast.error('Boost Failed', {
        description: errorMessage,
        duration: 5000,
      });
    },
  });
}

/**
 * Get simple balance value (just the number)
 * Useful for display in headers/badges
 * 
 * @example
 * ```tsx
 * const balance = useLacesBalanceSimple();
 * <Badge>{balance ?? 0} LACES</Badge>
 * ```
 */
export function useLacesBalanceSimple(): number | undefined {
  const { data } = useLacesBalance();
  return data?.balance;
}

/**
 * Check if user can afford an action
 * 
 * @example
 * ```tsx
 * const canAfford = useCanAffordLaces(50);
 * <Button disabled={!canAfford}>Buy for 50 LACES</Button>
 * ```
 */
export function useCanAffordLaces(amount: number): boolean {
  const balance = useLacesBalanceSimple();
  return balance !== undefined && balance >= amount;
}

/**
 * Filter ledger by transaction type
 * Helper hook for viewing specific transaction categories
 * 
 * @example
 * ```tsx
 * const earnings = useTransactionsByType('DAILY_STIPEND');
 * const spending = useTransactionsByType('PURCHASE');
 * ```
 */
export function useTransactionsByType(
  transactionType: TransactionType,
  page: number = 1
) {
  return useLacesLedger({
    page,
    limit: 20,
    transaction_type: transactionType,
  });
}

/**
 * Check if daily stipend is available
 * Derived from earning opportunities
 * 
 * @example
 * ```tsx
 * const canClaim = useCanClaimDailyStipend();
 * <Button disabled={!canClaim}>Claim Daily Stipend</Button>
 * ```
 */
export function useCanClaimDailyStipend(): boolean {
  const { data } = useEarningOpportunities();
  return data?.daily_stipend_claimed === false;
}

/**
 * Get formatted balance display
 * Includes thousands separators and LACES suffix
 * 
 * @example
 * ```tsx
 * const balanceText = useFormattedBalance();
 * <span>{balanceText}</span> // "1,250 LACES"
 * ```
 */
export function useFormattedBalance(): string {
  const balance = useLacesBalanceSimple();
  if (balance === undefined) return '...';
  return `${balance.toLocaleString()} LACES`;
}
