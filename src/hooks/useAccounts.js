import { useCallback, useEffect, useState } from 'react';

/**
 * Real savings accounts (goal + liquid) for the signed-in user, backed by
 * the ledger. Loans and investments stay mock data for now — this hook
 * only covers what Phase 3 wired up.
 */
export function useAccounts() {
  const [state, setState] = useState({ status: 'loading', accounts: [], error: null });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setState({ status: 'ready', accounts: data.accounts, error: null });
    } catch (err) {
      setState({ status: 'error', accounts: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const goal = state.accounts.find((a) => a.kind === 'goal') ?? null;
  const liquid = state.accounts.find((a) => a.kind === 'liquid') ?? null;

  return { ...state, goal, liquid, refetch };
}
