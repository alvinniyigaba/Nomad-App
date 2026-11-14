/** A share or ratio (0.184) as a whole percentage: "18%". */
export function percent(ratio) {
  return `${Math.round(ratio * 100)}%`;
}

/** Minor units as a short major-unit figure for tight spaces: "12.4M", "850K", "900". */
export function compactMinor(minor) {
  const n = Number(minor) / 100;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
