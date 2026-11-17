// Pure arithmetic for loan agreements: no database, no clock. Everything a
// member sees about a loan (what they owe or are owed, interest, the
// repayment plan, whether they're behind) is derived here from the stored
// agreement, its parties and its payments. Amounts are minor units (UGX ×
// 100) as BigInt; dates are 'YYYY-MM-DD' strings.

const MINOR_PER_UGX = 100n;

/** Rounds a minor-unit amount to whole shillings, halves up. */
function roundToShilling(minor) {
  return ((minor + MINOR_PER_UGX / 2n) / MINOR_PER_UGX) * MINOR_PER_UGX;
}

/**
 * Flat interest on `shareMinor` for the whole term: share × rate × months.
 * A yearly rate is spread evenly over 12 months. Rounded to whole shillings.
 */
export function flatInterestMinor(shareMinor, { rateBps = 0, ratePeriod = 'month', termMonths = null } = {}) {
  if (!rateBps || !termMonths) return 0n;
  const perMonthDivisor = ratePeriod === 'year' ? 12n : 1n;
  const numerator = BigInt(shareMinor) * BigInt(rateBps) * BigInt(termMonths);
  const denominator = 10000n * perMonthDivisor;
  return roundToShilling((numerator + denominator / 2n) / denominator);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** The k-th monthly due date after `firstDueDate`, on `dueDay` or the month's last day if shorter. */
export function nthDueDate(firstDueDate, dueDay, k) {
  const [y, m] = firstDueDate.split('-').map(Number);
  const monthIndex = m - 1 + k;
  const year = y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(dueDay, daysInMonth(year, month));
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Equal monthly instalments that add up exactly to `totalMinor`: each is
 * the total ÷ months in whole shillings, and the last takes what's left.
 */
export function buildSchedule(totalMinor, { termMonths, firstDueDate, dueDay }) {
  if (!termMonths || !firstDueDate || !dueDay) return [];
  const total = BigInt(totalMinor);
  const n = BigInt(termMonths);
  const each = (total / n / MINOR_PER_UGX) * MINOR_PER_UGX;
  return Array.from({ length: termMonths }, (_, k) => ({
    dueDate: nthDueDate(firstDueDate, dueDay, k),
    amountMinor: k === termMonths - 1 ? total - each * (n - 1n) : each,
  }));
}

/** Where a payer stands against a plan: what's fallen due, how far behind, and what's due next. */
export function planProgress(schedule, paidMinor, today) {
  let dueToDate = 0n;
  let cumulative = 0n;
  let next = null;
  for (const instalment of schedule) {
    cumulative += instalment.amountMinor;
    if (instalment.dueDate <= today) dueToDate = cumulative;
    if (!next && cumulative > paidMinor) {
      next = { dueDate: instalment.dueDate, amountMinor: (cumulative - paidMinor < instalment.amountMinor ? cumulative - paidMinor : instalment.amountMinor) };
    }
  }
  const behind = dueToDate > paidMinor ? dueToDate - paidMinor : 0n;
  return { dueToDateMinor: dueToDate, behindMinor: behind, next };
}

const max0 = (v) => (v > 0n ? v : 0n);

/**
 * The whole picture of one agreement. `parties` and `payments` are the
 * stored rows (camelCased, amounts as BigInt-able values); only confirmed
 * payments count. Returns per-party figures plus the agreement's derived
 * status: 'repaid' once nothing is outstanding, 'overdue' once the last
 * due date has passed with money still owed.
 */
export function computeAgreement(agreement, parties, payments, today) {
  const principal = BigInt(agreement.principalMinor);
  const terms = { rateBps: agreement.rateBps, ratePeriod: agreement.ratePeriod, termMonths: agreement.termMonths };
  const plan = { termMonths: agreement.termMonths, firstDueDate: agreement.firstDueDate, dueDay: agreement.dueDay };
  const joint = agreement.liability === 'joint';

  const confirmed = payments.filter((p) => p.status === 'confirmed');
  const paidBy = new Map();
  const receivedBy = new Map();
  for (const p of confirmed) {
    const amount = BigInt(p.amountMinor);
    paidBy.set(p.payerPartyId, (paidBy.get(p.payerPartyId) ?? 0n) + amount);
    receivedBy.set(p.payeePartyId, (receivedBy.get(p.payeePartyId) ?? 0n) + amount);
  }

  const borrowers = parties.filter((p) => p.role === 'borrower');
  const lenders = parties.filter((p) => p.role === 'lender');

  const borrowerFigures = borrowers.map((b) => {
    const share = BigInt(b.shareMinor);
    const interest = flatInterestMinor(share, terms);
    return { partyId: b.id, shareMinor: share, interestMinor: interest, totalDueMinor: share + interest, paidMinor: paidBy.get(b.id) ?? 0n };
  });
  const totalDue = borrowerFigures.reduce((s, b) => s + b.totalDueMinor, 0n);
  const totalInterest = borrowerFigures.reduce((s, b) => s + b.interestMinor, 0n);
  const totalPaid = borrowerFigures.reduce((s, b) => s + b.paidMinor, 0n);
  const outstanding = max0(totalDue - totalPaid);

  const jointSchedule = joint ? buildSchedule(totalDue, plan) : [];
  const jointProgress = joint ? planProgress(jointSchedule, totalPaid, today) : null;

  const borrowersOut = borrowerFigures.map((b) => {
    if (joint) {
      return {
        ...b,
        outstandingMinor: outstanding,
        // A joint borrower is liable for the whole, but counts only their
        // share of it in their own position, so no shilling is counted twice.
        positionOweMinor: principal > 0n ? (outstanding * b.shareMinor) / principal : 0n,
        schedule: jointSchedule,
        ...jointProgress,
      };
    }
    const schedule = buildSchedule(b.totalDueMinor, plan);
    const out = max0(b.totalDueMinor - b.paidMinor);
    return { ...b, outstandingMinor: out, positionOweMinor: out, schedule, ...planProgress(schedule, b.paidMinor, today) };
  });

  const lendersOut = lenders.map((l) => {
    const share = BigInt(l.shareMinor);
    const due = principal > 0n ? (totalDue * share) / principal : 0n;
    const received = receivedBy.get(l.id) ?? 0n;
    return { partyId: l.id, shareMinor: share, totalDueMinor: due, receivedMinor: received, outstandingMinor: max0(due - received) };
  });

  const schedules = joint ? [jointSchedule] : borrowersOut.map((b) => b.schedule);
  const lastPlanned = schedules.flat().reduce((last, i) => (i.dueDate > last ? i.dueDate : last), '');
  const finalDueDate = lastPlanned || agreement.dueDate || null;

  let status = agreement.status;
  if (status === 'active') {
    if (outstanding <= 0n) status = 'repaid';
    else if (finalDueDate && finalDueDate < today) status = 'overdue';
  }

  return {
    status,
    principalMinor: principal,
    interestMinor: totalInterest,
    totalDueMinor: totalDue,
    paidMinor: totalPaid,
    outstandingMinor: outstanding,
    finalDueDate,
    borrowers: borrowersOut,
    lenders: lendersOut,
  };
}

/**
 * Checks a new agreement before it's stored. Returns an error message, or
 * null when it's fine. Shares must be positive whole shillings and each
 * side must add up to the principal.
 */
export function validateAgreementShape({ principalMinor, rateBps, ratePeriod, termMonths, firstDueDate, dueDay, liability, lenders, borrowers }) {
  const isWholeShillings = (v) => typeof v === 'bigint' && v > 0n && v % MINOR_PER_UGX === 0n;
  if (!isWholeShillings(principalMinor)) return 'The loan amount must be a positive whole number of shillings.';
  if (!lenders.length || !borrowers.length) return 'A loan needs at least one lender and one borrower.';
  for (const p of [...lenders, ...borrowers]) {
    if (!isWholeShillings(p.shareMinor)) return 'Each person’s share must be a positive whole number of shillings.';
  }
  const sum = (list) => list.reduce((s, p) => s + p.shareMinor, 0n);
  if (sum(lenders) !== principalMinor) return 'The lenders’ shares must add up to the loan amount.';
  if (sum(borrowers) !== principalMinor) return 'The borrowers’ shares must add up to the loan amount.';
  if (!['split', 'joint'].includes(liability)) return 'Choose split or joint.';
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 100000) return 'The interest rate must be between 0% and 1000%.';
  if (!['month', 'year'].includes(ratePeriod)) return 'The rate must be per month or per year.';
  if (termMonths != null && (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 600)) return 'The term must be between 1 and 600 months.';
  if (rateBps > 0 && termMonths == null) return 'A loan with interest needs a term in months.';
  if ((firstDueDate == null) !== (dueDay == null)) return 'A repayment plan needs both a first payment date and a due day.';
  if (firstDueDate != null) {
    if (termMonths == null) return 'A repayment plan needs a term in months.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) return 'The first payment date must be a date.';
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return 'The due day must be between 1 and 31.';
  }
  return null;
}
