export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function ksh(n) {
  return 'UGX ' + fmt(n);
}

export function pct(n, digits = 1) {
  return n.toFixed(digits) + '%';
}

/** Minor units (UGX * 100, as returned by the API) -> a display-ready major-unit number. */
export function fromMinor(minor) {
  return Number(BigInt(minor ?? 0)) / 100;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** SQL date string -> "February 2027" */
export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** SQL date string -> "5 December" */
export function formatDayMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
