// Badges for loans that aren't simply open — an active loan shows its
// outstanding amount instead. Shared by the Borrow list and loan detail.
export const LOAN_STATUS_BADGE = {
  proposed: { label: 'Waiting', variant: 'outline' },
  overdue: { label: 'Overdue', variant: 'gold' },
  repaid: { label: 'Repaid', variant: 'solid' },
  written_off: { label: 'Written off', variant: 'outline' },
};

/** How far along repayment is, 0–1: what's come back against everything due (interest included). */
export function repaidShare(loan) {
  const due = Number(loan.totalDueMinor ?? loan.principalMinor);
  return due > 0 ? Math.min(1, Math.max(0, Number(loan.repaidMinor) / due)) : 0;
}

/**
 * Everything on the member's loans waiting for them: loans to accept or
 * decline, and payments to confirm. Home and Borrow show these as prompts.
 */
export function loanPrompts(loans) {
  const prompts = [];
  for (const loan of loans) {
    if (loan.needsMyAnswer) {
      prompts.push({ key: `answer-${loan.id}`, loanId: loan.id, kind: 'answer', title: `${loan.counterparty} added you to a loan`, detail: loan.direction === 'lent' ? 'You’d be lending. Accept or decline.' : 'You’d be borrowing. Accept or decline.' });
    }
    for (const p of loan.pendingPayments ?? []) {
      if (p.canConfirm) prompts.push({ key: `confirm-${p.id}`, loanId: loan.id, kind: 'confirm', title: `Did ${p.payer} pay you?`, detail: `${p.payer} says they paid you. Confirm it or say you didn’t receive it.`, amountMinor: p.amountMinor });
    }
  }
  return prompts;
}

/** "2% a month (24% a year)" — always shows both, whichever the loan was set up with. */
export function rateLabel(rateBps, ratePeriod) {
  if (!rateBps) return 'No interest';
  const pct = (v) => `${Number((v / 100).toFixed(2))}%`;
  return ratePeriod === 'year' ? `${pct(rateBps)} a year (${pct(rateBps / 12)} a month)` : `${pct(rateBps)} a month (${pct(rateBps * 12)} a year)`;
}

/** 30 → "30th" */
export function ordinal(n) {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}
