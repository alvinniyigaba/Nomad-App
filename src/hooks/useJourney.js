import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from './useAccounts';
import { useExternalHoldings } from './useExternalHoldings';
import { useLoans } from './useLoans';
import { buildJourneyModel } from '../utils/journeyModel';

const EMPTY = { expenses: [], income: [], stageOverride: null };

/** What Nomad has on record about the member's costs and income, plus any stage override. Admin-entered; read-only here. */
function useJourneyRecords() {
  const [state, setState] = useState({ status: 'loading', journey: EMPTY, error: null });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await fetch('/api/journey');
      if (!res.ok) throw new Error('Failed to load your journey');
      setState({ status: 'ready', journey: await res.json(), error: null });
    } catch (err) {
      setState({ status: 'error', journey: EMPTY, error: err.message });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

/**
 * The journey model for the signed-in member (see utils/journeyModel.js),
 * loaded from the accounts, holdings, loans and journey endpoints together.
 * `status` is 'loading' until all four have answered and 'error' if any
 * failed; `model` is null until it is 'ready'.
 */
export function useJourney() {
  const { user } = useAppState();
  const accounts = useAccounts();
  const holdings = useExternalHoldings();
  const loans = useLoans();
  const records = useJourneyRecords();

  const parts = [accounts, holdings, loans, records];
  const failed = parts.find((p) => p.status === 'error');
  const status = failed ? 'error' : parts.every((p) => p.status === 'ready') ? 'ready' : 'loading';

  const model = useMemo(
    () => (status === 'ready' ? buildJourneyModel({ accounts: accounts.accounts, holdings: holdings.holdings, loanTotals: loans.totals, journey: records.journey, user }) : null),
    [status, accounts.accounts, holdings.holdings, loans.totals, records.journey, user],
  );

  const refetch = () => parts.forEach((p) => p.refetch());

  return { status, error: failed?.error ?? null, refetch, model, accounts: accounts.accounts, holdings: holdings.holdings, loans: loans.loans, loanTotals: loans.totals };
}
