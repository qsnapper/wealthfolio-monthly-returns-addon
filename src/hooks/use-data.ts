import { useQuery } from "@tanstack/react-query";
import { QueryKeys, type Account, type AccountValuation, type AddonContext } from "@wealthfolio/addon-sdk";

/**
 * Picker value for "All accounts". It is never sent to Wealthfolio: since 3.12
 * the whole portfolio is asked for by leaving the account id out (the old
 * "TOTAL" id is treated as an unknown account and fails).
 */
export const PORTFOLIO_ID = "all";

export function useAccounts(ctx: AddonContext) {
  return useQuery<Account[]>({
    queryKey: [QueryKeys.ACCOUNTS],
    queryFn: async () => (await ctx.api.accounts.getAll()) ?? [],
    staleTime: 10 * 60 * 1000,
  });
}

export function useValuationHistory(ctx: AddonContext, accountId: string, enabled = true) {
  return useQuery<AccountValuation[]>({
    enabled,
    queryKey: QueryKeys.valuationHistory(accountId),
    queryFn: async () =>
      (await ctx.api.portfolio.getHistoricalValuations(accountId === PORTFOLIO_ID ? undefined : accountId)) ?? [],
    staleTime: 5 * 60 * 1000,
  });
}
