import test from 'node:test';
import assert from 'node:assert/strict';
import { ageFrom, holdingMonthlyIncomeMinor, holdingValueMinor, independenceRatio, monthlyExpensesMinor, runwayMonths, toMonthlyMinor } from '../independence.js';
import { buildJourneyModel } from '../journeyModel.js';
import { nextLevelChecklist, placeMember } from '../placement.js';
import { buildPosition } from '../position.js';
import { buildSectors, buildSpread, ringFor, spreadCheck } from '../spread.js';

const UGX = (n) => String(n * 100); // major units -> minor-unit string, as the API sends it
const TODAY = new Date('2026-11-14T09:00:00Z');

const nomadFund = { id: 'h1', managedBy: 'nomad', status: 'active', interestRateBps: 1200, investmentCurrency: 'KES', sector: 'MMF', history: [{ date: '2026-01-01', valueMinor: UGX(20000000) }, { date: '2026-11-01', valueMinor: UGX(21400000) }] };
const fixedDeposit = { id: 'h2', managedBy: 'external', status: 'active', interestRateBps: 1600, investmentCurrency: 'UGX', sector: 'Fixed deposit', balanceMinor: UGX(12800000) };
const usdGoal = { id: 'h3', managedBy: 'external', status: 'active', interestRateBps: null, investmentCurrency: 'USD', sector: null, balanceMinor: UGX(4300000) };
const invited = { id: 'h4', managedBy: 'nomad', status: 'invited', interestRateBps: 1500, history: [] };
const holdings = [nomadFund, fixedDeposit, usdGoal, invited];

const accounts = [
  { id: 'l', kind: 'liquid', isGroup: false, balanceMinor: UGX(3100000) },
  { id: 'g', kind: 'goal', isGroup: false, balanceMinor: UGX(5000000) },
  { id: 'gg', kind: 'goal', isGroup: true, balanceMinor: UGX(9000000), members: [{ username: 'niyigaba', contributionMinor: UGX(1000000) }, { username: 'angel', contributionMinor: UGX(8000000) }] },
];
const journey = {
  expenses: [
    { category: 'household', amountMinor: UGX(900000), frequency: 'monthly' },
    { category: 'rent', amountMinor: UGX(800000), frequency: 'monthly' },
    { category: 'school_fees', amountMinor: UGX(1350000), frequency: 'termly' },
    { category: 'transport', amountMinor: UGX(250000), frequency: 'monthly' },
  ],
  income: [
    { label: 'Salary', kind: 'active', amountMinor: UGX(4800000), frequency: 'monthly' },
    { label: 'Rent received', kind: 'passive', amountMinor: UGX(50000), frequency: 'monthly' },
  ],
  stageOverride: null,
};
const model = (over = {}) => buildJourneyModel({ accounts, holdings, loanTotals: { owedToYouMinor: UGX(2000000), youOweMinor: UGX(500000) }, journey, user: { username: 'niyigaba', dateOfBirth: '1992-03-10' }, today: TODAY, ...over });

test('termly costs count as three payments a year, in whole minor units', () => {
  assert.equal(toMonthlyMinor('1000', 'yearly'), 83);
  assert.equal(toMonthlyMinor(UGX(1350000), 'termly'), 337500 * 100);
  assert.equal(toMonthlyMinor(UGX(1200000), 'yearly'), 100000 * 100);
  assert.equal(monthlyExpensesMinor(journey.expenses), 2287500 * 100);
});

test('a holding is valued from its latest snapshot or its recorded balance', () => {
  assert.equal(holdingValueMinor(nomadFund), 21400000 * 100);
  assert.equal(holdingValueMinor(fixedDeposit), 12800000 * 100);
  assert.equal(holdingValueMinor(invited), null);
});

test('projected income needs a rate, a value and an active holding', () => {
  assert.equal(holdingMonthlyIncomeMinor(nomadFund), 214000 * 100);
  assert.equal(holdingMonthlyIncomeMinor(usdGoal), null);
  assert.equal(holdingMonthlyIncomeMinor(invited), null);
});

test('independence and runway are unknown, not zero, without costs on record', () => {
  assert.equal(independenceRatio(500, 0), null);
  assert.equal(runwayMonths(500, 0), null);
  assert.equal(independenceRatio(250, 1000), 0.25);
});

test('age counts whole years to the birthday', () => {
  assert.equal(ageFrom('1992-03-10', TODAY), 34);
  assert.equal(ageFrom('1992-12-10', TODAY), 33);
  assert.equal(ageFrom(null, TODAY), null);
});

test('position counts only the member’s own share of a group goal', () => {
  const p = buildPosition({ accounts, holdings, loanTotals: { owedToYouMinor: UGX(2000000), youOweMinor: UGX(500000) }, username: 'niyigaba' });
  assert.equal(p.savedMinor, (3100000 + 5000000 + 1000000) * 100);
  assert.equal(p.investedMinor, (21400000 + 12800000 + 4300000) * 100);
  assert.equal(p.netWorthMinor, (9100000 + 38500000 + 2000000 - 500000) * 100);
});

test('the full model: a salaried 34-year-old with investments is a Herder', () => {
  const m = model();
  assert.equal(Number.isInteger(m.passiveIncomeMinor), true);
  assert.equal(Math.round(m.passiveIncomeMinor / 100), 214000 + 170667 + 50000);
  assert.equal(Math.round(m.independence * 100), 19);
  assert.equal(m.runway.toFixed(2), '1.36');
  assert.equal(m.stage.id, 'herder');
  assert.equal(m.placement.source, 'balance_sheet');
  assert.equal(m.next.target, 'Kin Keeper or Granary Keeper');
  assert.deepEqual(m.next.items.map((i) => i.done), [false, false]);
});

test('the balance sheet outranks age: a young member whose income covers costs is an Elder', () => {
  const p = placeMember({ independence: 1.1, runway: 8, age: 32, investedMinor: 1 });
  assert.equal(p.id, 'elder');
  assert.equal(placeMember({ independence: 0.6, runway: 2, age: 30, investedMinor: 1 }).id, 'rain_reader');
});

test('heavy school and medical costs make a Kin Keeper, otherwise a Granary Keeper', () => {
  const base = { independence: 0.3, runway: 4, age: 44, investedMinor: 1, expensesMonthlyMinor: 1000 };
  assert.equal(placeMember({ ...base, expenses: [{ category: 'school_fees', monthlyMinor: 400 }, { category: 'rent', monthlyMinor: 600 }] }).id, 'kin_keeper');
  assert.equal(placeMember({ ...base, expenses: [{ category: 'school_fees', monthlyMinor: 100 }, { category: 'rent', monthlyMinor: 900 }] }).id, 'granary_keeper');
});

test('business income makes a Caravaneer; no cushion and nothing invested makes a Tracker', () => {
  assert.equal(placeMember({ independence: 0.1, runway: 2, age: 30, investedMinor: 1, income: [{ kind: 'active', label: 'Business' }] }).id, 'caravaneer');
  assert.equal(placeMember({ independence: 0, runway: 0.4, age: 22, investedMinor: 0 }).id, 'tracker');
});

test('without costs on record, age sets a starting point and says so', () => {
  assert.deepEqual([placeMember({ independence: null, age: 22, investedMinor: 0 }).id, placeMember({ independence: null, age: 33, investedMinor: 0 }).id, placeMember({ independence: null, age: 45, investedMinor: 0 }).id, placeMember({ independence: null, age: 55, investedMinor: 0 }).id], ['tracker', 'herder', 'granary_keeper', 'rain_reader']);
  assert.equal(placeMember({ independence: null, age: 33, investedMinor: 0 }).source, 'age');
  assert.equal(placeMember({ independence: null, age: null, investedMinor: 5 }).id, 'herder');
  assert.equal(model({ journey: { expenses: [], income: [], stageOverride: null } }).independence, null);
});

test('an override from Nomad beats everything, and an unknown one is ignored', () => {
  assert.equal(placeMember({ stageOverride: 'elder', independence: 0, runway: 0, age: 20, investedMinor: 0 }).source, 'override');
  assert.equal(placeMember({ stageOverride: 'wizard', independence: null, age: 22, investedMinor: 0 }).id, 'tracker');
});

test('checklist items that need costs are unknown rather than failed; an Elder has none', () => {
  const c = nextLevelChecklist({ level: 2, independence: null, runway: null, investedMinor: 1 });
  assert.deepEqual(c.items.map((i) => [i.unknown, i.done]), [[true, false], [true, false]]);
  assert.deepEqual(nextLevelChecklist({ level: 5, independence: 1.2, runway: 20, investedMinor: 1 }), { target: null, items: [] });
  assert.equal(nextLevelChecklist({ level: 1, independence: 0, runway: 1.5, investedMinor: 0 }).items[0].done, true);
});

test('spread groups by currency into home, region and world', () => {
  assert.deepEqual([ringFor('UGX'), ringFor(null), ringFor('KES'), ringFor('USD')], ['home', 'home', 'region', 'world']);
  const s = buildSpread({ savedMinor: 9100000 * 100, holdings });
  assert.equal(s.totalMinor, 47600000 * 100);
  assert.deepEqual(s.rings.map((r) => Math.round(r.share * 100)), [46, 45, 9]);
  assert.deepEqual(s.currencies.map((c) => c.code), ['UGX', 'KES', 'USD']);
  assert.equal(spreadCheck({ spread: s, level: 2 }).status, 'low');
  assert.equal(spreadCheck({ spread: buildSpread({ savedMinor: 0, holdings: [] }), level: 2 }), null);
});

test('sectors are summed largest first, with unlabelled holdings last', () => {
  const sectors = buildSectors(holdings);
  assert.deepEqual(sectors.map((s) => s.sector), ['MMF', 'Fixed deposit', null]);
  assert.equal(Math.round(sectors[0].share * 100), 56);
  assert.equal(sectors.reduce((sum, s) => sum + s.count, 0), 3);
});
