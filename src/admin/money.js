const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Minor units (UGX × 100, as the API sends them) → "UGX 1,234,500". Blank stays a dash, never 0. */
export function ugx(minor, { signed = false } = {}) {
  if (minor == null || minor === '') return '—';
  const big = BigInt(minor);
  const negative = big < 0n;
  const abs = negative ? -big : big;
  const whole = abs / 100n;
  const cents = abs % 100n;
  const text = whole.toLocaleString('en-US') + (cents ? '.' + cents.toString().padStart(2, '0') : '');
  const sign = negative ? '−' : signed && big > 0n ? '+' : '';
  return `${sign}UGX ${text}`;
}

/** "1,250,000" or "1250000.50" typed in UGX → minor units, or null if it isn't a number. */
export function toMinor(text) {
  const cleaned = String(text ?? '').replace(/[,\s]/g, '').replace(/^UGX/i, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Minor units → plain UGX number text for prefilling an input. */
export function toMajorText(minor) {
  if (minor == null || minor === '') return '';
  return (Number(BigInt(minor)) / 100).toString();
}

export function pctFromBps(bps) {
  if (bps == null) return '—';
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

/**
 * Date or timestamp → "26 Nov 2026". Postgres date columns arrive as UTC
 * midnight ("2026-11-01T00:00:00.000Z"), so those are read as calendar
 * dates rather than shifted into the browser's time zone.
 */
export function day(value) {
  if (!value) return '—';
  const text = String(value);
  const calendar = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(text);
  const d = new Date(calendar ? text.slice(0, 10) + 'T00:00:00Z' : text);
  if (Number.isNaN(d.getTime())) return '—';
  return calendar
    ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${day(value)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "3 days ago", "today", "never". */
export function ago(value) {
  if (!value) return 'never';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return day(value);
}

/** Today's date as YYYY-MM-DD in Kampala (UTC+3), the date members see. */
export function todayKampala() {
  return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
}

/** Calendar date as YYYY-MM-DD from whatever the API sent (date or timestamp). */
export function isoDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}
