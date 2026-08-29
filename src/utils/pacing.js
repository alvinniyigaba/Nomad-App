/**
 * Straight-line pacing: given a goal's opening date and target date, is the
 * current balance ahead of, on, or behind the amount you'd need by now to
 * be on track? Returns null when there's no target to pace against.
 */
export function paceStatus({ createdAt, targetDate, targetMinor, balanceMinor }) {
  if (!targetDate || !targetMinor) return null;

  const target = Number(BigInt(targetMinor));
  const balance = Number(BigInt(balanceMinor));
  const pctFunded = target > 0 ? Math.round((balance / target) * 100) : 0;

  const start = new Date(createdAt).getTime();
  const end = new Date(targetDate).getTime();
  const now = Date.now();

  if (now >= end || end <= start) {
    return { pctFunded, behindMinor: 0, aheadMinor: 0, pastDue: now >= end };
  }

  const elapsedFrac = Math.max(0, (now - start) / (end - start));
  const expected = target * elapsedFrac;
  const diff = expected - balance;

  return {
    pctFunded,
    behindMinor: diff > 0 ? Math.round(diff) : 0,
    aheadMinor: diff < 0 ? Math.round(-diff) : 0,
    pastDue: false,
  };
}
