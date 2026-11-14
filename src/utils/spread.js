import { HOME_CURRENCY, HOME_SHARE_GUIDE, REGION_CURRENCIES } from '../config/journeyRules.js';
import { holdingValueMinor } from './independence.js';

const RINGS = [
  { id: 'home', label: 'Home' },
  { id: 'region', label: 'Region' },
  { id: 'world', label: 'World' },
];

/** Which ring a currency falls in. A holding with no currency on record is treated as home. */
export function ringFor(currency) {
  if (!currency || currency === HOME_CURRENCY) return 'home';
  return REGION_CURRENCIES.includes(currency) ? 'region' : 'world';
}

/**
 * Where a member's savings and investments sit, by the currency each is
 * held in: home, the region, the wider world. Savings with Nomad are home.
 * Values are the UGX estimates the app already holds — a holding's native
 * amount isn't on record, so nothing here is converted.
 *
 * Returns { totalMinor, rings: [{ id, label, valueMinor, share }],
 * currencies: [{ code, valueMinor, share, ring }] } with currencies sorted
 * largest first.
 */
export function buildSpread({ savedMinor, holdings }) {
  const byCurrency = new Map();
  const add = (code, value) => byCurrency.set(code, (byCurrency.get(code) ?? 0) + value);

  if (savedMinor > 0) add(HOME_CURRENCY, savedMinor);
  for (const h of holdings) {
    const value = h.status === 'active' ? holdingValueMinor(h) : null;
    if (value) add(h.investmentCurrency || HOME_CURRENCY, value);
  }

  const totalMinor = [...byCurrency.values()].reduce((a, b) => a + b, 0);
  const share = (v) => (totalMinor > 0 ? v / totalMinor : 0);
  const currencies = [...byCurrency.entries()]
    .map(([code, valueMinor]) => ({ code, valueMinor, share: share(valueMinor), ring: ringFor(code) }))
    .sort((a, b) => b.valueMinor - a.valueMinor);
  const rings = RINGS.map((r) => {
    const valueMinor = currencies.filter((c) => c.ring === r.id).reduce((sum, c) => sum + c.valueMinor, 0);
    return { ...r, valueMinor, share: share(valueMinor) };
  });
  return { totalMinor, rings, currencies };
}

/**
 * Active, valued holdings grouped by sector, largest first. Holdings with
 * no sector on record are grouped under `null` so the screen can say so
 * instead of guessing one.
 */
export function buildSectors(holdings) {
  const bySector = new Map();
  for (const h of holdings) {
    const value = h.status === 'active' ? holdingValueMinor(h) : null;
    if (!value) continue;
    const key = h.sector?.trim() || null;
    const entry = bySector.get(key) ?? { sector: key, valueMinor: 0, count: 0 };
    entry.valueMinor += value;
    entry.count += 1;
    bySector.set(key, entry);
  }
  const totalMinor = [...bySector.values()].reduce((sum, s) => sum + s.valueMinor, 0);
  return [...bySector.values()]
    .map((s) => ({ ...s, share: totalMinor > 0 ? s.valueMinor / totalMinor : 0 }))
    .sort((a, b) => (a.sector === null) - (b.sector === null) || b.valueMinor - a.valueMinor);
}

/**
 * Compares the share held at home against the guide range for the member's
 * level. Advisory only. Returns null when there is nothing to assess.
 * `status`: 'in_range' | 'low' (too little at home) | 'high' (too much).
 */
export function spreadCheck({ spread, level }) {
  const guide = HOME_SHARE_GUIDE[level];
  if (!guide || spread.totalMinor <= 0) return null;
  const home = spread.rings.find((r) => r.id === 'home').share;
  const largestAway = spread.currencies.find((c) => c.ring !== 'home') ?? null;
  const status = home < guide.min ? 'low' : home > guide.max ? 'high' : 'in_range';
  return { status, homeShare: home, guide, largestAway };
}
