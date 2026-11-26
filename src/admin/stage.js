import { buildJourneyModel } from '../utils/journeyModel.js';
import { isoDate, todayKampala } from './money.js';

/** The figure in force today for each key: the latest row that has started, unless it retired the item (amount 0). */
export function current(rows, keyOf) {
  const today = todayKampala();
  const byKey = new Map();
  for (const r of rows) {
    if (isoDate(r.effectiveFrom) > today) continue;
    const key = keyOf(r);
    const prev = byKey.get(key);
    if (!prev || isoDate(r.effectiveFrom) > isoDate(prev.effectiveFrom) || (isoDate(r.effectiveFrom) === isoDate(prev.effectiveFrom) && r.createdAt > prev.createdAt)) byKey.set(key, r);
  }
  return [...byKey.values()].filter((r) => BigInt(r.amountMinor) > 0n);
}

/**
 * The member's stage and independence as their own app works it out —
 * the same buildJourneyModel, fed from the admin member payload instead of
 * the member endpoints, so the console can't disagree with the app.
 */
export function memberJourney(data) {
  const accounts = data.accounts.filter((a) => !a.closedAt);
  // The member app reads a Nomad-managed holding's value off its history (oldest first).
  const holdings = data.holdings.map((h) => ({
    ...h,
    history: [...(h.snapshots ?? [])].map((sn) => ({ date: isoDate(sn.date), valueMinor: sn.valueMinor })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  }));
  const { expenses, income, placements } = data.finances;
  const journey = {
    expenses: current(expenses, (e) => e.category),
    income: current(income, (i) => i.label),
    stageOverride: placements[0]?.stage ?? null,
  };
  return buildJourneyModel({ accounts, holdings, loanTotals: data.loans.totals, journey, user: data.profile });
}
