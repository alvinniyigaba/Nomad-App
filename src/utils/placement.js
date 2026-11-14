import { ARCHETYPE_BY_ID, MAX_LEVEL, nextLevelNames } from '../data/archetypes.js';
import { NEXT_LEVEL, PLACEMENT } from '../config/journeyRules.js';

const BUSINESS_INCOME = /business|venture|trade|shop|farm/i;

/**
 * Which stage a member is at, and why.
 *
 * The balance sheet decides whenever there is one: independence and
 * runway outrank age, so a 34-year-old whose investments cover their costs
 * is an Elder. Age only sets a starting point while no costs are on
 * record, and an override entered by Nomad beats both.
 *
 * `source` says which of those applied: 'override' | 'balance_sheet' |
 * 'age' | 'default'. `reasons` are short, member-facing sentences.
 */
export function placeMember({ stageOverride, independence, runway, age, investedMinor, expenses = [], expensesMonthlyMinor = 0, income = [] }) {
  if (stageOverride && ARCHETYPE_BY_ID[stageOverride]) {
    return { id: stageOverride, source: 'override', reasons: ['Set by Nomad after reviewing your position'] };
  }

  const invests = investedMinor > 0;

  if (independence == null) {
    if (age == null) {
      return invests
        ? { id: 'herder', source: 'default', reasons: ['You already hold investments'] }
        : { id: 'tracker', source: 'default', reasons: ['A starting point until your costs are on record'] };
    }
    if (age >= PLACEMENT.rainReaderAge) return { id: 'rain_reader', source: 'age', reasons: [`Members aged ${PLACEMENT.rainReaderAge} and over usually start here`] };
    if (age >= PLACEMENT.consolidatingAge) return { id: 'granary_keeper', source: 'age', reasons: [`Members in their ${Math.floor(age / 10) * 10}s usually start here`] };
    if (age <= PLACEMENT.trackerMaxAge && !invests) return { id: 'tracker', source: 'age', reasons: ['Members under 25 usually start here'] };
    return { id: 'herder', source: 'age', reasons: [invests ? 'You already hold investments' : 'Members aged 25 to 40 usually start here'] };
  }

  const pct = `${Math.round(independence * 100)}%`;
  if (independence >= PLACEMENT.elderIndependence) {
    return { id: 'elder', source: 'balance_sheet', reasons: [`Your passive income covers ${pct} of your costs`] };
  }
  if (independence >= PLACEMENT.rainReaderIndependence) {
    return { id: 'rain_reader', source: 'balance_sheet', reasons: [`Your passive income covers ${pct} of your costs`] };
  }
  if (age != null && age >= PLACEMENT.rainReaderAge) {
    return { id: 'rain_reader', source: 'balance_sheet', reasons: ['You are in the last stretch before retirement', `Passive income covers ${pct} of your costs so far`] };
  }

  if (independence >= PLACEMENT.consolidatingIndependence || (age != null && age >= PLACEMENT.consolidatingAge)) {
    const dependantMinor = expenses.filter((e) => e.category === 'school_fees' || e.category === 'medical').reduce((sum, e) => sum + e.monthlyMinor, 0);
    const share = expensesMonthlyMinor > 0 ? dependantMinor / expensesMonthlyMinor : 0;
    if (share >= PLACEMENT.dependantCostShare) {
      return { id: 'kin_keeper', source: 'balance_sheet', reasons: [`School fees and medical are ${Math.round(share * 100)}% of your costs`, `Passive income covers ${pct} of your costs`] };
    }
    return { id: 'granary_keeper', source: 'balance_sheet', reasons: [`Passive income covers ${pct} of your costs`, 'You hold enough that consolidating matters'] };
  }

  if (!invests && runway < PLACEMENT.trackerRunwayMonths) {
    return { id: 'tracker', source: 'balance_sheet', reasons: ['You have under a month of runway', 'Nothing invested yet'] };
  }
  if (income.some((i) => i.kind === 'active' && BUSINESS_INCOME.test(i.label))) {
    return { id: 'caravaneer', source: 'balance_sheet', reasons: ['Part of your income comes from a business', `Passive income covers ${pct} of your costs`] };
  }
  return { id: 'herder', source: 'balance_sheet', reasons: [invests ? 'You already hold investments' : 'You have a cushion to build from', `Passive income covers ${pct} of your costs`] };
}

/**
 * What stands between a member and the next level, as a checklist. An item
 * that depends on costs Nomad hasn't recorded yet is `unknown`, not failed.
 * Empty for an Elder.
 */
export function nextLevelChecklist({ level, independence, runway, investedMinor }) {
  if (level >= MAX_LEVEL) return { target: null, items: [] };
  const need = NEXT_LEVEL[level];
  const items = [];
  const months = (n) => `${n} month${n === 1 ? '' : 's'}`;

  if (need.runwayMonths != null) {
    items.push({
      label: `${months(need.runwayMonths)} of runway`,
      unknown: runway == null,
      done: runway != null && runway >= need.runwayMonths,
      detail: runway == null ? 'Needs your monthly costs' : `${runway.toFixed(1)} of ${need.runwayMonths} months`,
    });
  }
  if (need.needsInvestment) {
    items.push({ label: 'Make a first investment', unknown: false, done: investedMinor > 0, detail: investedMinor > 0 ? 'Done' : 'Nothing invested yet' });
  }
  if (need.independence != null) {
    items.push({
      label: `Independence at ${Math.round(need.independence * 100)}%`,
      unknown: independence == null,
      done: independence != null && independence >= need.independence,
      detail: independence == null ? 'Needs your monthly costs' : `${Math.round(independence * 100)}% now`,
    });
  }
  return { target: nextLevelNames(level), items };
}
