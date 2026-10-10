import { query } from './db.js';

// Statuses that still count toward a member's position. A repaid loan has
// nothing outstanding anyway; a written-off one is treated as uncollectable.
const OPEN_STATUSES = new Set(['active', 'overdue']);

/**
 * A member's private loans (money they lent out or borrowed outside Nomad),
 * each with its repayment history and what's still outstanding — derived
 * as principal minus repayments, never stored. Totals cover open loans
 * only: owedToYou is what others still owe this member, youOwe the reverse.
 */
export async function getLoansForUser(userId) {
  const { rows: loanRows } = await query(
    'SELECT * FROM loans WHERE user_id = $1 ORDER BY start_date ASC NULLS LAST, created_at ASC',
    [userId],
  );
  if (loanRows.length === 0) return { loans: [], totals: { owedToYouMinor: '0', youOweMinor: '0' } };

  const { rows: repaymentRows } = await query(
    `SELECT r.* FROM loan_repayments r JOIN loans l ON l.id = r.loan_id
     WHERE l.user_id = $1 ORDER BY r.paid_on ASC, r.created_at ASC`,
    [userId],
  );

  let owedToYou = 0n;
  let youOwe = 0n;
  const loans = loanRows.map((row) => {
    const repayments = repaymentRows.filter((r) => r.loan_id === row.id);
    const repaid = repayments.reduce((sum, r) => sum + BigInt(r.amount_minor), 0n);
    const outstanding = BigInt(row.principal_minor) - repaid;
    if (OPEN_STATUSES.has(row.status) && outstanding > 0n) {
      if (row.direction === 'lent') owedToYou += outstanding;
      else youOwe += outstanding;
    }
    return {
      id: row.id,
      loanRef: row.loan_ref,
      direction: row.direction,
      counterparty: row.counterparty,
      principalMinor: row.principal_minor.toString(),
      repaidMinor: repaid.toString(),
      outstandingMinor: outstanding.toString(),
      terms: row.terms,
      startDate: row.start_date,
      dueDate: row.due_date,
      status: row.status,
      notes: row.notes,
      repayments: repayments.map((r) => ({ id: r.id, amountMinor: r.amount_minor.toString(), paidOn: r.paid_on, memo: r.memo })),
    };
  });

  return { loans, totals: { owedToYouMinor: owedToYou.toString(), youOweMinor: youOwe.toString() } };
}
