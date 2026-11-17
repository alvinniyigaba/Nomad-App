// Pure planning for the Nomad Money link: given what the phone sent and what
// the database already holds, decide what (if anything) to write. No I/O here,
// so every rule is unit-tested (src/utils/__tests__/moneyLink.test.js).
//
// Ownership, agreed with Niyigaba (Nov 2026):
//   - day-to-day costs + declared income: Nomad Money writes them (append-only rows)
//   - savings contributions: CHECK ONLY while calibrating; the sheet stays the
//     route into the ledger, the phone's figures are compared, never posted
//   - outright loans: created in Nomad; repayments come from Nomad Money only for
//     loans whose repayment_route is 'nomad_money', otherwise from the sheet
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
    if (typeof r?.loanRef !== 'string' || !r.loanRef.trim()) errs.push(`repayments[${i}]: loanRef is required`);
    if (!isDate(r?.paidOn)) errs.push(`repayments[${i}]: paidOn must be YYYY-MM-DD`);
    if (!isMinor(r?.amountMinor) || BigInt(r.amountMinor) <= 0n) errs.push(`repayments[${i}]: amountMinor must be above 0`);
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
 * Loan repayments, append-only. Each phone entry has a stable key (nm:<entry id>).
 * posted: [{ idempotencyKey, loanRef, amountMinor }] already in loan_repayments with an nm: key.
 * loans:  [{ loanRef, route }] the member's loans.
 * - new key on a nomad_money loan        -> insert
 * - key whose amount changed on the phone -> insert the difference (key:fix:<n>)
 * - key deleted on the phone              -> insert a reversal (key:rev)
 * - loan on the sheet route               -> skipped, reported
 */
export function planRepayments(items = [], posted = [], loans = []) {
  const route = Object.fromEntries(loans.map((l) => [l.loanRef, l.route]));
  const byBase = new Map();
  for (const p of posted) {
    const base = p.idempotencyKey.split(':fix:')[0].replace(/:rev$/, '');
    const e = byBase.get(base) || { loanRef: p.loanRef, total: 0n, keys: new Set() };
    e.total += BigInt(p.amountMinor); e.keys.add(p.idempotencyKey);
    byBase.set(base, e);
  }
  const inserts = [], skipped = [];
  const seen = new Set();
  for (const r of items) {
    seen.add(r.key);
    if (!(r.loanRef in route)) { skipped.push({ key: r.key, reason: `No loan ${r.loanRef} on record in Nomad` }); continue; }
    if (route[r.loanRef] !== 'nomad_money') { skipped.push({ key: r.key, reason: `Loan ${r.loanRef} is repaid through the sheet` }); continue; }
    const had = byBase.get(r.key);
    const want = BigInt(r.amountMinor);
    if (!had) { inserts.push({ idempotencyKey: r.key, loanRef: r.loanRef, amountMinor: want.toString(), paidOn: r.paidOn, memo: r.memo || null }); continue; }
    if (had.total === want) continue;
    let n = 1; while (had.keys.has(`${r.key}:fix:${n}`)) n++;
    inserts.push({ idempotencyKey: `${r.key}:fix:${n}`, loanRef: r.loanRef, amountMinor: (want - had.total).toString(), paidOn: r.paidOn, memo: 'Correction from Nomad Money' });
  }
  for (const [base, had] of byBase) {
    if (seen.has(base) || had.total === 0n || route[had.loanRef] !== 'nomad_money') continue;
    let n = 1; while (had.keys.has(`${base}:fix:${n}`)) n++;
    inserts.push({ idempotencyKey: `${base}:fix:${n}`, loanRef: had.loanRef, amountMinor: (-had.total).toString(), paidOn: new Date().toISOString().slice(0, 10), memo: 'Reversal: removed in Nomad Money' });
  }
  return { inserts, skipped };
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
