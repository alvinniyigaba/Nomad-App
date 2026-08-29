export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function ksh(n) {
  return 'KSh ' + fmt(n);
}

export function pct(n, digits = 1) {
  return n.toFixed(digits) + '%';
}
