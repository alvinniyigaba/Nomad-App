// Nomad's standard management fee — hardcoded, not user-editable.
export const MANAGEMENT_FEE_PCT = 5;

function futureValue({ principal, monthlyContribution, annualRatePct, years }) {
  const months = Math.round(years * 12);
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return principal + monthlyContribution * months;
  const principalGrowth = principal * Math.pow(1 + monthlyRate, months);
  const contributionGrowth = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return principalGrowth + contributionGrowth;
}

/**
 * Estimates portfolio value after `years`, comparing a gross projection (no
 * fees) against a net one. The management fee is ongoing — it drags the
 * annual return every year, compounding. The transaction cost is one-time —
 * it reduces the amount actually invested (principal and each contribution),
 * not the return itself.
 */
export function estimateYield({ principal, monthlyContribution = 0, annualRatePct, years, transactionCostPct = 0 }) {
  const gross = futureValue({ principal, monthlyContribution, annualRatePct, years });

  const costFactor = 1 - transactionCostPct / 100;
  const netAnnualRate = Math.max(0, annualRatePct - MANAGEMENT_FEE_PCT);
  const net = futureValue({
    principal: principal * costFactor,
    monthlyContribution: monthlyContribution * costFactor,
    annualRatePct: netAnnualRate,
    years,
  });

  return { grossValue: gross, netValue: net, totalCost: gross - net };
}
