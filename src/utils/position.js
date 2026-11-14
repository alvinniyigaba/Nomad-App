import { positionInvestedMinor } from './investmentSeries.js';

/**
 * A member's own position in minor units, split the way the app shows it.
 * Personal, not household: for a group goal only this member's own
 * contribution counts, never the pooled balance.
 */
export function buildPosition({ accounts, holdings, loanTotals, username }) {
  const own = accounts.filter((a) => !a.isGroup);
  const liquidMinor = own.filter((a) => a.kind === 'liquid').reduce((sum, a) => sum + Number(a.balanceMinor), 0);
  const goalsMinor = own.filter((a) => a.kind !== 'liquid').reduce((sum, a) => sum + Number(a.balanceMinor), 0);
  const groupMinor = accounts
    .filter((a) => a.isGroup)
    .reduce((sum, g) => sum + Number(g.members?.find((m) => m.username === username)?.contributionMinor ?? 0), 0);
  const savedMinor = liquidMinor + goalsMinor + groupMinor;
  const investedMinor = positionInvestedMinor(holdings);
  const owedToYouMinor = Number(loanTotals?.owedToYouMinor ?? 0);
  const youOweMinor = Number(loanTotals?.youOweMinor ?? 0);
  return {
    liquidMinor,
    goalsMinor,
    groupMinor,
    savedMinor,
    investedMinor,
    owedToYouMinor,
    youOweMinor,
    assetsMinor: savedMinor + investedMinor + owedToYouMinor,
    netWorthMinor: savedMinor + investedMinor + owedToYouMinor - youOweMinor,
  };
}
