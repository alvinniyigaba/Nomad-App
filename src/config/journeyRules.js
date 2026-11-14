/**
 * Every threshold the journey screens use, in one place.
 *
 * PROVISIONAL: these numbers were chosen to get the screens working and
 * have not been set by Nomad's investment committee. Change them here and
 * every screen follows; nothing else in the app hard-codes them.
 */

/** Balance-sheet signals that place a member at a stage (see utils/placement.js). */
export const PLACEMENT = {
  elderIndependence: 1, // passive income covers all day-to-day costs
  rainReaderIndependence: 0.5,
  rainReaderAge: 50,
  consolidatingIndependence: 0.25, // level 3: Kin Keeper / Granary Keeper
  consolidatingAge: 40,
  dependantCostShare: 0.3, // school fees + medical as a share of costs → Kin Keeper
  trackerRunwayMonths: 1, // under this with nothing invested → Tracker
  trackerMaxAge: 25, // age-only fallback when there are no costs on record
};

/** What a member needs to reach the next level. Keyed by the level they are on. */
export const NEXT_LEVEL = {
  1: { runwayMonths: 1, needsInvestment: true },
  2: { runwayMonths: 3, independence: 0.25 },
  3: { runwayMonths: 6, independence: 0.5 },
  4: { independence: 1 },
};

/**
 * Share of savings and investments held at home (in UGX) that the spread
 * check treats as "in range", by level. Outside it the check suggests
 * which way to lean; it never blocks anything.
 */
export const HOME_SHARE_GUIDE = {
  1: { min: 0.6, max: 1 },
  2: { min: 0.5, max: 0.7 },
  3: { min: 0.4, max: 0.6 },
  4: { min: 0.5, max: 0.7 },
  5: { min: 0.5, max: 0.8 },
};

/** The member's home currency. All amounts in the app are already in it. */
export const HOME_CURRENCY = 'UGX';

/** Currencies counted as "the region" (East African Community) in the spread rings. Anything else is "world". */
export const REGION_CURRENCIES = ['KES', 'TZS', 'RWF', 'BIF', 'SSP', 'CDF', 'SOS'];
