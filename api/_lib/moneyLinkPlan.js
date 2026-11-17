// Pure planning for the Nomad Money link: given what the phone sent and what
// the database already holds, decide what (if anything) to write. No I/O here,
// so every rule is unit-tested (src/utils/__tests__/moneyLink.test.js).
//
// Ownership, agreed with Niyigaba (Nov 2026):
//   - day-to-day costs + declared income: Nomad Money writes them (append-only rows)
//   - savings contributions: CHECK ONLY while calibrating; the sheet stays the
//     route into the ledger, the phone's figures are compared, never posted
//   - loans: set up in the Nomad App (loan_agreements). The phone records this
//     member's payments only on loans where their party's repayment_route is
//     'nomad_money', through recordPayment — so member loans still wait for the
//     other side to confirm, and nothing is edited after the fact
//   - overdrafts: stay in Nomad Money, never sent

export const EXPENSE_CATEGORIES = ['household', 'rent', 'school_fees', 'medical', 'transport', 'other'];
export const INCOME_KINDS = ['active', 'passive'];
export const SOURCE = 'nomad_money';

const isMinor = (v) => /^-?\d+$/.test(String(v ?? ''));
const isMonth = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v ?? ''));
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));

/** Shape check for the phone's payload. Returns a list of problems (empty = fine). */
export function validatePayload(p) {
  const errs = [];
  if (!p || typeof p !== 'object') return ['Body must be a JSON object'];
  if (!['preview', 'commit'].includes(p.mode)) errs.push('mode must be preview or commit');
  if (!isMonth(p.asOf)) errs.push('asOf must be YYYY-MM');
  if (p.costs != null) {
    if (typeof p.costs !== 'object' || Array.isArray(p.costs)) errs.push('costs must be an object of category -> amountMinor');
    else for (const [k, v] of Object.entries(p.costs)) {
      if (!EXPENSE_CATEGORIES.includes(k)) errs.push(`costs: unknown category "${k}"`);
      if (!isMinor(v) || BigInt(v) < 0n) errs.push(`costs.${k}: amountMinor must be a whole number, 0 or more`);
    }
  }
  for (const [i, r] of (p.income || []).entries()) {
    if (typeof r?.label !== 'string' || !r.label.trim()) errs.push(`income[${i}]: label is required`);
    if (!INCOME_KINDS.includes(r?.kind)) errs.push(`income[${i}]: kind must be active or passive`);
    if (!isMinor(r?.amountMinor) || BigInt(r.amountMinor) < 0n) errs.push(`income[${i}]: amountMinor must be 0 or more`);
  }
  for (const [i, r] of (p.contributions || []).entries()) {
    if (typeof r?.key !== 'string' || !r.key) errs.push(`contributions[${i}]: key is required`);
    if (typeof r?.account !== 'string' || !r.account.trim()) errs.push(`contributions[${i}]: account is required`);
    if (!isDate(r?.date)) errs.push(`contributions[${i}]: date must be YYYY-MM-DD`);
    if (!isMinor(r?.amountMinor)) errs.push(`contributions[${i}]: amountMinor must be a whole number`);
  }
  for (const [i, r] of (p.repayments || []).entries()) {
    if (typeof r?.key !== 'string' || !r.key.startsWith('nm:')) errs.push(`repayments[${i}]: key must start with "nm:"`);
    if (typeof r?.agreementId !== 'string' || !r.agreementId) errs.push(`repayments[${i}]: agreementId is required`);
    if (!isDate(r?.paidOn)) errs.push(`repayments[${i}]: paidOn must be YYYY-MM-DD`);
    if (!isMinor(r?.amountMinor) || BigInt(r.amountMinor) <= 0n || BigInt(r.amountMinor) % 100n !== 0n) errs.push(`repayments[${i}]: amountMinor must be whole shillings above 0`);
  }
  return errs;
}

/**
 * Costs: the phone sends one monthly figure per category (its 3-month average).
 * A row is appended only where it differs from the current figure on record,
 * so re-sending the same numbers writes nothing.
 * current: { [category]: amountMinor (string) } — latest row per category, any source.
 */
export function planCosts(costs = {}, current = {}, asOf) {
  const effectiveFrom = `${asOf}-01`;
  const rows = [], same = [];
  for (const category of EXPENSE_CATEGORIES) {
    if (!(category in costs)) continue;
    const amount = String(costs[category]);
    if (current[category] != null && String(current[category]) === amount) { same.push(category); continue; }
    rows.push({ category, amountMinor: amount, frequency: 'monthly', effectiveFrom, was: current[category] ?? null });
  }
  return { rows, unchanged: same };
}

/** Income: same rule as costs, keyed by label. current: { [label]: { kind, amountMinor } } */
export function planIncome(income = [], current = {}, asOf) {
  const effectiveFrom = `${asOf}-01`;
  const rows = [], unchanged = [];
  for (const r of income) {
    const label = r.label.trim();
    const cur = current[label];
    if (cur && cur.kind === r.kind && String(cur.amountMinor) === String(r.amountMinor)) { unchanged.push(label); continue; }
    rows.push({ label, kind: r.kind, amountMinor: String(r.amountMinor), frequency: 'monthly', effectiveFrom, was: cur ? cur.amountMinor : null });
  }
  return { rows, unchanged };
}

/**
 * Loan payments. Each phone entry has a stable key (nm:<entry id>).
 * posted: [{ key, agreementId, amountMinor, status }] — this member's loan_payments
 *   already made from the phone (key without the member prefix).
 * loans:  the member's loans as getLoansForUser returns them, each with `route`.
 * - new key on an active agreement routed to nomad_money -> record
 * - already recorded with the same amount               -> nothing
 * - amount changed or entry deleted on the phone        -> reported, never edited:
 *   a pending payment can be withdrawn in the Nomad App, a confirmed one needs an admin
 * - anything else (other route, not active, older loan, future date) -> skipped, with why
 */
export function planRepayments(items = [], posted = [], loans = [], today = new Date().toISOString().slice(0, 10)) {
  const byId = new Map(loans.map((l) => [l.id, l]));
  const done = new Map(posted.filter((p) => p.status !== 'cancelled' && p.status !== 'rejected').map((p) => [p.key, p]));
  const inserts = [], skipped = [], mismatched = [];
  const seen = new Set();
  for (const r of items) {
    seen.add(r.key);
    const loan = byId.get(r.agreementId);
    const why = !loan ? 'No such loan in Nomad'
      : loan.source !== 'agreement' ? 'Older loan not yet copied across — run migrate-legacy-loans'
      : loan.route !== 'nomad_money' ? `${loan.counterparty}: payments are recorded in the Nomad App`
      : loan.status === 'proposed' ? `${loan.counterparty}: not everyone has accepted yet`
      : r.paidOn > today ? 'Dated in the future'
      : null;
    if (why) { skipped.push({ key: r.key, reason: why }); continue; }
    const had = done.get(r.key);
    if (!had) { inserts.push({ key: r.key, agreementId: r.agreementId, counterparty: loan.counterparty, amountMinor: String(r.amountMinor), paidOn: r.paidOn, memo: r.memo || null }); continue; }
    if (String(had.amountMinor) !== String(r.amountMinor)) mismatched.push({ key: r.key, counterparty: loan.counterparty, nomadMinor: String(had.amountMinor), phoneMinor: String(r.amountMinor), status: had.status });
  }
  for (const [key, had] of done) {
    if (seen.has(key)) continue;
    const loan = byId.get(had.agreementId);
    mismatched.push({ key, counterparty: loan?.counterparty || 'a loan', nomadMinor: String(had.amountMinor), phoneMinor: '0', status: had.status });
  }
  return { inserts, skipped, mismatched };
}

/**
 * Contributions: compare only. ledger: [{ account, amountMinor }] this member's entries
 * per account (deposits positive, withdrawals negative). Accounts are matched by name,
 * case and spacing ignored, since both apps use the same names.
 */
export function compareContributions(items = [], ledger = [], accountNames = []) {
  const norm = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
  const known = new Map(accountNames.map((n) => [norm(n), n]));
  const phone = new Map(), server = new Map();
  for (const r of items) phone.set(norm(r.account), (phone.get(norm(r.account)) || 0n) + BigInt(r.amountMinor));
  for (const r of ledger) server.set(norm(r.account), (server.get(norm(r.account)) || 0n) + BigInt(r.amountMinor));
  const rows = [];
  for (const k of new Set([...phone.keys(), ...server.keys()])) {
    const p = phone.get(k) ?? 0n, s = server.get(k) ?? 0n;
    rows.push({ account: known.get(k) || [...items, ...ledger].find((r) => norm(r.account) === k)?.account || k,
      inNomad: known.has(k), phoneMinor: p.toString(), nomadMinor: s.toString(), differenceMinor: (p - s).toString(), status: !known.has(k) ? 'not in Nomad' : p === s ? 'match' : 'different' });
  }
  return rows.sort((a, b) => a.account.localeCompare(b.account));
}
