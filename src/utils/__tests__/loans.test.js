import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, computeAgreement, flatInterestMinor, nthDueDate, planProgress, validateAgreementShape } from '../../../api/_lib/loanMath.js';

const UGX = (n) => BigInt(n) * 100n;

// One lender, two borrowers sharing 2,000,000 equally, no interest,
// 12 monthly payments due on the 30th from January.
const base = {
  principalMinor: UGX(2000000),
  rateBps: 0,
  ratePeriod: 'month',
  termMonths: 12,
  firstDueDate: '2027-01-30',
  dueDay: 30,
  dueDate: null,
  liability: 'split',
  status: 'active',
};
const parties = [
  { id: 'L', role: 'lender', shareMinor: UGX(2000000) },
  { id: 'A', role: 'borrower', shareMinor: UGX(1000000) },
  { id: 'B', role: 'borrower', shareMinor: UGX(1000000) },
];
const pay = (id, payer, amount, status = 'confirmed', paidOn = '2027-01-30') => ({ id, payerPartyId: payer, payeePartyId: 'L', amountMinor: UGX(amount), status, paidOn });

test('due dates fall on the due day, or the month end when the month is shorter', () => {
  assert.equal(nthDueDate('2027-01-30', 30, 0), '2027-01-30');
  assert.equal(nthDueDate('2027-01-30', 30, 1), '2027-02-28');
  assert.equal(nthDueDate('2027-01-30', 30, 11), '2027-12-30');
  assert.equal(nthDueDate('2027-11-30', 31, 2), '2028-01-31');
  assert.equal(nthDueDate('2028-01-31', 31, 1), '2028-02-29');
});

test('instalments are whole shillings and add up exactly to the total', () => {
  const schedule = buildSchedule(UGX(1000000), { termMonths: 12, firstDueDate: '2027-01-30', dueDay: 30 });
  assert.equal(schedule.length, 12);
  assert.equal(schedule[0].amountMinor, UGX(83333));
  assert.equal(schedule[11].amountMinor, UGX(83337));
  assert.equal(schedule.reduce((s, i) => s + i.amountMinor, 0n), UGX(1000000));
  assert.equal(schedule[11].dueDate, '2027-12-30');
});

test('flat interest is on the original amount for the whole term', () => {
  assert.equal(flatInterestMinor(UGX(1000000), { rateBps: 500, ratePeriod: 'month', termMonths: 4 }), UGX(200000));
  assert.equal(flatInterestMinor(UGX(1000000), { rateBps: 200, ratePeriod: 'month', termMonths: 8 }), UGX(160000));
  assert.equal(flatInterestMinor(UGX(1000000), { rateBps: 2400, ratePeriod: 'year', termMonths: 6 }), UGX(120000));
  assert.equal(flatInterestMinor(UGX(1000000), { rateBps: 0, termMonths: 12 }), 0n);
});

test('split: each borrower pays off only their own share', () => {
  const r = computeAgreement(base, parties, [pay('p1', 'A', 125000), pay('p2', 'B', 50000, 'pending')], '2027-01-31');
  const [a, b] = r.borrowers;
  assert.equal(a.outstandingMinor, UGX(875000));
  assert.equal(b.outstandingMinor, UGX(1000000), 'a pending payment does not count');
  assert.equal(r.lenders[0].outstandingMinor, UGX(1875000));
  assert.equal(a.behindMinor, 0n);
  assert.equal(b.behindMinor, UGX(83333));
  assert.equal(b.next.dueDate, '2027-01-30');
  assert.equal(r.status, 'active');
});

test('joint: both owe the whole, each counts only their share in their position', () => {
  const joint = { ...base, liability: 'joint' };
  const r = computeAgreement(joint, parties, [pay('p1', 'A', 300000), pay('p2', 'B', 200000)], '2027-03-01');
  const [a, b] = r.borrowers;
  assert.equal(a.outstandingMinor, UGX(1500000));
  assert.equal(b.outstandingMinor, UGX(1500000));
  assert.equal(a.positionOweMinor + b.positionOweMinor, UGX(1500000));
  assert.equal(a.paidMinor, UGX(300000));
  assert.equal(a.behindMinor, 0n, 'two instalments of 166,666 are due; 500,000 has been paid together');
});

test('status: repaid when nothing is left, overdue after the last due date', () => {
  const paidOff = computeAgreement(base, parties, [pay('p1', 'A', 1000000), pay('p2', 'B', 1000000)], '2027-06-01');
  assert.equal(paidOff.status, 'repaid');
  const late = computeAgreement(base, parties, [pay('p1', 'A', 1000000)], '2028-01-02');
  assert.equal(late.status, 'overdue');
  const proposed = computeAgreement({ ...base, status: 'proposed' }, parties, [], '2027-06-01');
  assert.equal(proposed.status, 'proposed');
});

test('plan progress reports a part-paid instalment as the remainder', () => {
  const schedule = buildSchedule(UGX(1200000), { termMonths: 12, firstDueDate: '2027-01-30', dueDay: 30 });
  const p = planProgress(schedule, UGX(150000), '2027-02-28');
  assert.equal(p.dueToDateMinor, UGX(200000));
  assert.equal(p.behindMinor, UGX(50000));
  assert.deepEqual(p.next, { dueDate: '2027-02-28', amountMinor: UGX(50000) });
});

test('validation catches shares that do not add up and interest without a term', () => {
  const ok = { principalMinor: UGX(2000000), rateBps: 0, ratePeriod: 'month', termMonths: 12, firstDueDate: '2027-01-30', dueDay: 30, liability: 'split', lenders: [{ shareMinor: UGX(2000000) }], borrowers: [{ shareMinor: UGX(1000000) }, { shareMinor: UGX(1000000) }] };
  assert.equal(validateAgreementShape(ok), null);
  assert.match(validateAgreementShape({ ...ok, borrowers: [{ shareMinor: UGX(1000000) }] }), /borrowers/);
  assert.match(validateAgreementShape({ ...ok, rateBps: 500, termMonths: null, firstDueDate: null, dueDay: null }), /term/);
  assert.match(validateAgreementShape({ ...ok, principalMinor: 150n, lenders: [{ shareMinor: 150n }], borrowers: [{ shareMinor: 150n }] }), /whole/);
});
