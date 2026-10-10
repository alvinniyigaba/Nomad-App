import { useCallback, useEffect, useState } from 'react';

const EMPTY_TOTALS = { owedToYouMinor: '0', youOweMinor: '0' };

/**
 * The user's private loans — money they lent to, or borrowed from, people
 * outside Nomad — with repayments and derived outstanding amounts.
 * Admin-entered from their sheet; read-only here. A member with none gets
 * an empty list and zero totals.
 */
export function useLoans() {
  const [state, setState] = useState({ status: 'loading', loans: [], totals: EMPTY_TOTALS, error: null });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/external-holdings?resource=loans');
      if (!res.ok) throw new Error('Failed to load loans');
      const data = await res.json();
      setState({ status: 'ready', loans: data.loans, totals: data.totals, error: null });
    } catch (err) {
      setState({ status: 'error', loans: [], totals: EMPTY_TOTALS, error: err.message });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

/**
 * What loans add to a member's position: money owed to them counts as
 * theirs, money they owe counts against them. Home and the Position
 * summary both use this so their totals can't drift apart.
 */
export function netLoansMinor(totals) {
  return Number(totals.owedToYouMinor) - Number(totals.youOweMinor);
}
