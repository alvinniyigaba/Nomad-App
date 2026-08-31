/**
 * Builds a portfolio value-over-time series from nomad-managed holdings'
 * snapshot history, carrying each holding's last known value forward
 * across dates it wasn't itself updated on — a simple step-chart NAV curve.
 */
export function buildPortfolioSeries(holdings) {
  const active = holdings.filter((h) => h.managedBy === 'nomad' && h.status === 'active' && h.history?.length);
  if (active.length === 0) return [];

  const allDates = [...new Set(active.flatMap((h) => h.history.map((pt) => pt.date)))].sort();
  const lastKnown = {};
  return allDates.map((date) => {
    for (const h of active) {
      const pt = h.history.find((p) => p.date === date);
      if (pt) lastKnown[h.id] = Number(pt.valueMinor);
    }
    const totalMinor = active.reduce((sum, h) => sum + (lastKnown[h.id] ?? 0), 0);
    return { date, totalMinor };
  });
}

/** Change from the last value before this calendar year (or the series' first point) to the latest. */
export function ytdChangeMinor(series) {
  if (series.length === 0) return 0;
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const before = [...series].reverse().find((pt) => pt.date < yearStart);
  const startValue = before ? before.totalMinor : series[0].totalMinor;
  return series[series.length - 1].totalMinor - startValue;
}

/** SVG polyline "x,y ..." points for a series, scaled into the given viewBox. */
export function chartPolylinePoints(series, { width = 330, height = 104, padding = 10 } = {}) {
  if (series.length === 0) return '';
  const values = series.map((p) => p.totalMinor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return series
    .map((p, i) => {
      const x = series.length === 1 ? width / 2 : (i / (series.length - 1)) * width;
      const y = height - padding - ((p.totalMinor - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
