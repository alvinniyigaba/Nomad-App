import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload, planCosts, planIncome, planRepayments, compareContributions } from '../../../api/_lib/moneyLinkPlan.js';

const UGX = (n) => String(n * 100);

test('payload validation catches bad shapes', () => {
  assert.deepEqual(validatePayload({ mode: 'preview', asOf: '2026-11' }), []);
  const errs = validatePayload({ mode: 'send', asOf: 'Nov', costs: { food: UGX(1) }, repayments: [{ key: 'x', agreementId: '', paidOn: '1/11', amountMinor: '0' }] });
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

test('repayments: record new ones on routed, accepted loans; report changes, never edit', () => {
  const loans = [
    { id: 'A1', source: 'agreement', status: 'active', route: 'nomad_money', counterparty: 'Kirabo' },
    { id: 'A2', source: 'agreement', status: 'active', route: 'app', counterparty: 'Brian' },
    { id: 'A3', source: 'agreement', status: 'proposed', route: 'nomad_money', counterparty: 'Group' },
    { id: 'L1', source: 'legacy', status: 'active', route: 'app', counterparty: 'Bank' },
  ];
  const posted = [
    { key: 'nm:10', agreementId: 'A1', amountMinor: UGX(100000), status: 'confirmed' },
    { key: 'nm:11', agreementId: 'A1', amountMinor: UGX(50000), status: 'pending' },
    { key: 'nm:9', agreementId: 'A1', amountMinor: UGX(5000), status: 'cancelled' }, // withdrawn: ignored
  ];
  const items = [
    { key: 'nm:10', agreementId: 'A1', paidOn: '2026-11-01', amountMinor: UGX(120000) }, // edited on phone
    { key: 'nm:12', agreementId: 'A1', paidOn: '2026-11-05', amountMinor: UGX(70000) },  // new
    { key: 'nm:13', agreementId: 'A2', paidOn: '2026-11-05', amountMinor: UGX(10000) },  // recorded in the app
    { key: 'nm:14', agreementId: 'A3', paidOn: '2026-11-05', amountMinor: UGX(10000) },  // not accepted yet
    { key: 'nm:15', agreementId: 'L1', paidOn: '2026-11-05', amountMinor: UGX(10000) },  // older loan
    { key: 'nm:16', agreementId: 'A1', paidOn: '2026-12-01', amountMinor: UGX(10000) },  // future
  ]; // nm:11 was deleted on the phone
  const { inserts, skipped, mismatched } = planRepayments(items, posted, loans, '2026-11-17');
  assert.deepEqual(inserts.map((i) => [i.key, i.amountMinor]), [['nm:12', UGX(70000)]]);
  assert.equal(skipped.length, 4);
  assert.ok(skipped.some((x) => x.reason.includes('migrate-legacy-loans')));
  assert.deepEqual(mismatched.map((m) => [m.key, m.nomadMinor, m.phoneMinor, m.status]),
    [['nm:10', UGX(100000), UGX(120000), 'confirmed'], ['nm:11', UGX(50000), '0', 'pending']]);
  assert.equal(planRepayments([items[1]], [{ ...posted[0], key: 'nm:12', amountMinor: UGX(70000) }], loans, '2026-11-17').inserts.length, 0);
});

test('payload: payments must be whole shillings', () => {
  const errs = validatePayload({ mode: 'preview', asOf: '2026-11', repayments: [{ key: 'nm:1', agreementId: 'A1', paidOn: '2026-11-01', amountMinor: '12345' }] });
  assert.ok(errs.some((e) => e.includes('whole shillings')));
});

test('contributions are compared by name, never posted', () => {
  const rows = compareContributions(
    [{ key: 'nm:1', account: 'Our First Fund', date: '2026-09-26', amountMinor: UGX(75000) }, { key: 'nm:2', account: 'our first  fund', date: '2026-10-31', amountMinor: UGX(75000) }, { key: 'nm:3', account: 'Valor Group', date: '2026-10-14', amountMinor: UGX(50000) }],
    [{ account: 'Our First Fund', amountMinor: UGX(75000) }],
    ['Our First Fund'],
  );
  assert.deepEqual(rows.map((r) => [r.account, r.status, r.differenceMinor]), [['Our First Fund', 'different', UGX(75000)], ['Valor Group', 'not in Nomad', UGX(50000)]]);
});
