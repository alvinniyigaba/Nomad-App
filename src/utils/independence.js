// Financial independence = passive income covering day-to-day costs.
// Everything here works in minor units (UGX * 100) and plain numbers, and
// is derived on demand: nothing is stored. Derived amounts are rounded to
// whole minor units, because the app's formatters only take whole ones.

const PER_YEAR = { monthly: 12, termly: 3, yearly: 1 };

/** An amount paid at some frequency, as the monthly figure it works out to. School terms count as three a year. */
export function toMonthlyMinor(amountMinor, frequency) {
  return Math.round((Number(amountMinor) * (PER_YEAR[frequency] ?? 12)) / 12);
}

/** Total day-to-day costs a month across every category on record. 0 when none are. */
export function monthlyExpensesMinor(expenses) {
  return expenses.reduce((sum, e) => sum + toMonthlyMinor(e.amountMinor, e.frequency), 0);
}

/** Declared income a month of one kind ('active' or 'passive'). */
export function declaredIncomeMinor(income, kind) {
  return income.filter((i) => i.kind === kind).reduce((sum, i) => sum + toMonthlyMinor(i.amountMinor, i.frequency), 0);
}

/** A holding's current value: its latest snapshot when Nomad manages it, otherwise the balance on record. Null when neither exists. */
export function holdingValueMinor(holding) {
  if (holding.managedBy === 'nomad') {
    const last = holding.history?.[holding.history.length - 1];
    return last ? Number(last.valueMinor) : null;
  }
  return holding.balanceMinor != null ? Number(holding.balanceMinor) : null;
}

/**
 * What a holding is expected to earn a month: its current value at its
 * annual rate. A projection from the rate on record, not income actually
 * received — screens must label it so. Null when the holding has no rate
 * or no value, so it can be shown as unknown rather than as zero.
 */
export function holdingMonthlyIncomeMinor(holding) {
  const value = holdingValueMinor(holding);
  if (holding.status !== 'active' || value == null || holding.interestRateBps == null) return null;
  return Math.round((value * holding.interestRateBps) / 10000 / 12);
}

/** Projected income a month across all holdings that have a rate. */
export function holdingsMonthlyIncomeMinor(holdings) {
  return holdings.reduce((sum, h) => sum + (holdingMonthlyIncomeMinor(h) ?? 0), 0);
}

/**
 * Passive income ÷ day-to-day costs. 1 means independent. Null when no
 * costs are on record: the ratio is unknown then, not zero and not infinite.
 */
export function independenceRatio(passiveMonthlyMinor, expensesMonthlyMinor) {
  return expensesMonthlyMinor > 0 ? passiveMonthlyMinor / expensesMonthlyMinor : null;
}

/** Months of day-to-day costs the liquid fund would cover. Null when no costs are on record. */
export function runwayMonths(liquidMinor, expensesMonthlyMinor) {
  return expensesMonthlyMinor > 0 ? liquidMinor / expensesMonthlyMinor : null;
}

/** Whole years since a date of birth ('YYYY-MM-DD' or ISO string). Null when there isn't one. */
export function ageFrom(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < dob.getUTCMonth() || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
