import { useCallback, useEffect, useState } from 'react';

/** All of the user's savings/investment holdings — both Nomad-managed and external (self-reported), admin-entered. Filter by managedBy. */
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
