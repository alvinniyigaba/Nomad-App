import { useCallback, useEffect, useState } from 'react';

/** Savings/investment products Nomad doesn't manage — self-reported, admin-entered. */
export function useExternalHoldings() {
  const [state, setState] = useState({ status: 'loading', holdings: [], error: null });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/external-holdings');
      if (!res.ok) throw new Error('Failed to load external holdings');
      const data = await res.json();
      setState({ status: 'ready', holdings: data.holdings, error: null });
    } catch (err) {
      setState({ status: 'error', holdings: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}
