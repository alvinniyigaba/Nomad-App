import { ARCHETYPE_BY_ID } from '../data/archetypes.js';
import { ageFrom, declaredIncomeMinor, holdingsMonthlyIncomeMinor, independenceRatio, monthlyExpensesMinor, runwayMonths, toMonthlyMinor } from './independence.js';
import { nextLevelChecklist, placeMember } from './placement.js';
import { buildPosition } from './position.js';
import { buildSectors, buildSpread, spreadCheck } from './spread.js';

/**
 * Everything the journey screens show, derived in one pass from what the
 * API returns: the member's position, monthly costs and income,
 * independence, runway, stage, the way to the next level, and how their
 * money is spread. Pure, so every screen that calls it agrees.
 */
export function buildJourneyModel({ accounts, holdings, loanTotals, journey, user, today = new Date() }) {
  const position = buildPosition({ accounts, holdings, loanTotals, username: user?.username });

  const expenses = (journey?.expenses ?? []).map((e) => ({ ...e, monthlyMinor: toMonthlyMinor(e.amountMinor, e.frequency) }));
  const income = (journey?.income ?? []).map((i) => ({ ...i, monthlyMinor: toMonthlyMinor(i.amountMinor, i.frequency) }));

  const expensesMonthlyMinor = monthlyExpensesMinor(expenses);
  const holdingsIncomeMinor = holdingsMonthlyIncomeMinor(holdings);
  const declaredPassiveMinor = declaredIncomeMinor(income, 'passive');
  const activeIncomeMinor = declaredIncomeMinor(income, 'active');
  const passiveIncomeMinor = holdingsIncomeMinor + declaredPassiveMinor;

  const independence = independenceRatio(passiveIncomeMinor, expensesMonthlyMinor);
  const runway = runwayMonths(position.liquidMinor, expensesMonthlyMinor);

  const placement = placeMember({
    stageOverride: journey?.stageOverride ?? null,
    independence,
    runway,
    age: ageFrom(user?.dateOfBirth, today),
    investedMinor: position.investedMinor,
    expenses,
    expensesMonthlyMinor,
    income,
  });
  const stage = ARCHETYPE_BY_ID[placement.id];
  const spread = buildSpread({ savedMinor: position.savedMinor, holdings });

  return {
    position,
    expenses,
    income,
    expensesMonthlyMinor,
    holdingsIncomeMinor,
    declaredPassiveMinor,
    activeIncomeMinor,
    passiveIncomeMinor,
    independence,
    runway,
    hasCosts: expensesMonthlyMinor > 0,
    stage,
    placement,
    next: nextLevelChecklist({ level: stage.level, independence, runway, investedMinor: position.investedMinor }),
    spread,
    spreadCheck: spreadCheck({ spread, level: stage.level }),
    sectors: buildSectors(holdings),
  };
}
