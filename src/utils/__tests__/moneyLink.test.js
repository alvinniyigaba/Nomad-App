import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload, planCosts, planIncome, planRepayments, compareContributions } from '../../../api/_lib/moneyLinkPlan.js';

const UGX = (n) => String(n * 100);

test('payload validation catches bad shapes', () => {
  assert.deepEqual(validatePayload({ mode: 'preview', asOf: '2026-11' }), []);
  const errs = validatePayload({ mode: 'send', asOf: 'Nov', costs: { food: UGX(1) }, repayments: [{ key: 'x', loanRef: '', paidOn: '1/11', amountMinor: '0' }] });
  assert.ok(errs.some((e) => e.includes('mode')));
  assert.ok(errs.some((e) => e.includes('asOf')));
  assert.ok(errs.some((e) => e.includes('unknown category "food"')));
  assert.ok(errs.some((e) => e.includes('key must start with "nm:"')));
});

test('costs: only changed categories are appended, dated from the 1st of asOf', () => {
  const plan = planCosts({ household: UGX(1300000), transport: UGX(250000) }, { household: UGX(900000), transport: UGX(250000), rent: UGX(800000) }, '2026-11');
  assert.deepEqual(plan.unchanged, ['transport']);
  assert.equal(plan.rows.length, 1);
  assert.deepEqual(plan.rows[0], { category: 'household', amountMinor: UGX(1300000), frequency: 'monthly', effectiveFrom: '2026-11-01', was: UGX(900000) });
  assert.equal(planCosts({ household: UGX(1) }, { household: UGX(1) }, '2026-11').rows.length, 0); // resend = no write
});

test('income: a kind change counts as a change', () => {
  const plan = planIncome([{ label: 'Business', kind: 'active', amountMinor: UGX(2000000) }, { label: 'Rent received', kind: 'passive', amountMinor: UGX(50000) }],
    { Business: { kind: 'active', amountMinor: UGX(2000000) }, 'Rent received': { kind: 'active', amountMinor: UGX(50000) } }, '2026-11');
  assert.deepEqual(plan.unchanged, ['Business']);
  assert.equal(plan.rows[0].label, 'Rent received');
});

test('repayments: insert, correct, reverse, and respect the sheet route', () => {
  const loans = [{ loanRef: 'L-1', route: 'nomad_money' }, { loanRef: 'L-2', route: 'sheet' }];
  const posted = [
    { idempotencyKey: 'nm:10', loanRef: 'L-1', amountMinor: UGX(100000) },
    { idempotencyKey: 'nm:11', loanRef: 'L-1', amountMinor: UGX(50000) },
  ];
  const items = [
    { key: 'nm:10', loanRef: 'L-1', paidOn: '2026-11-01', amountMinor: UGX(100000) }, // unchanged
    { key: 'nm:12', loanRef: 'L-1', paidOn: '2026-11-05', amountMinor: UGX(70000) },  // new
    { key: 'nm:13', loanRef: 'L-2', paidOn: '2026-11-05', amountMinor: UGX(10000) },  // sheet loan
  ]; // nm:11 was deleted on the phone
  const { inserts, skipped } = planRepayments(items, posted, loans);
  assert.deepEqual(inserts.map((i) => [i.idempotencyKey, i.amountMinor]), [['nm:12', UGX(70000)], ['nm:11:fix:1', UGX(-50000)]]);
  assert.equal(skipped[0].reason, 'Loan L-2 is repaid through the sheet');
  // amount edited on the phone: post only the difference, once
  const again = planRepayments([{ key: 'nm:10', loanRef: 'L-1', paidOn: '2026-11-01', amountMinor: UGX(120000) }], [posted[0]], loans);
  assert.deepEqual(again.inserts.map((i) => [i.idempotencyKey, i.amountMinor]), [['nm:10:fix:1', UGX(20000)]]);
  const settled = planRepayments([{ key: 'nm:10', loanRef: 'L-1', paidOn: '2026-11-01', amountMinor: UGX(120000) }],
    [posted[0], { idempotencyKey: 'nm:10:fix:1', loanRef: 'L-1', amountMinor: UGX(20000) }], loans);
  assert.equal(settled.inserts.length, 0);
});

test('contributions are compared by name, never posted', () => {
  const rows = compareContributions(
    [{ key: 'nm:1', account: 'Our First Fund', date: '2026-09-26', amountMinor: UGX(75000) }, { key: 'nm:2', account: 'our first  fund', date: '2026-10-31', amountMinor: UGX(75000) }, { key: 'nm:3', account: 'Valor Group', date: '2026-10-14', amountMinor: UGX(50000) }],
    [{ account: 'Our First Fund', amountMinor: UGX(75000) }],
    ['Our First Fund'],
  );
  assert.deepEqual(rows.map((r) => [r.account, r.status, r.differenceMinor]), [['Our First Fund', 'different', UGX(75000)], ['Valor Group', 'not in Nomad', UGX(50000)]]);
});
