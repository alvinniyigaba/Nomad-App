import { useCallback, useEffect, useState } from 'react';

export function useKyc() {
  const [state, setState] = useState({ status: 'loading', kyc: null, error: null });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/kyc');
      if (!res.ok) throw new Error('Failed to load verification status');
      setState({ status: 'ready', kyc: await res.json(), error: null });
    } catch (err) {
      setState({ status: 'error', kyc: null, error: err.message });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function markDone(field) {
    const res = await fetch('/api/kyc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: true }),
    });
    if (!res.ok) return;
    const kyc = await res.json();
    setState({ status: 'ready', kyc, error: null });
  }

  return { ...state, refetch, markDone };
}
