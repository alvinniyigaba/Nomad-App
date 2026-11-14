/**
 * The terrain motif, redrawn for each stage's landscape: the contour lines
 * a member sees change as they move along the trail. Thin lines at low
 * opacity, as the brand asks; deterministic, so it renders the same
 * everywhere. Fills its (positioned) parent.
 */
const f = (n) => Math.round(n * 10) / 10;

const TERRAINS = {
  // Kalahari dunes: rows of small crescents.
  tracker(w, h) {
    let d = '';
    for (let r = 0; r * 34 < h + 20; r++) {
      for (let x = (r % 2) * 22 - 10; x < w; x += 44) {
        const y = r * 34 + 20;
        d += `M${x} ${y}Q${x + 18} ${y - 16} ${x + 36} ${y}Q${x + 18} ${y - 7} ${x} ${y}`;
      }
    }
    return d;
  },
  // Sahel grassland: long gentle swells with tufts of grass.
  herder(w, h) {
    let d = '';
    for (let y = 12; y < h; y += 22) {
      d += `M-10 ${y}C${f(w * 0.25)} ${y - 8} ${f(w * 0.55)} ${y + 8} ${w + 10} ${y}`;
      for (let x = 20 + (y % 44); x < w; x += 64) d += `M${x} ${y + 10}l0 -6M${x + 5} ${y + 10}l2 -5`;
    }
    return d;
  },
  // Sand ridges: long ridgelines running across, like the trade routes.
  caravaneer(w, h) {
    let d = '';
    for (let y = -120; y < h + 40; y += 24) {
      d += `M-20 ${y + 40}C${f(w * 0.2)} ${y} ${f(w * 0.45)} ${y + 70} ${f(w * 0.7)} ${y + 30}S${w + 10} ${y + 50} ${w + 30} ${y}`;
    }
    return d;
  },
  // Desert plateau: level terraces stepping down.
  kin_keeper(w, h) {
    let d = '';
    for (let y = 10; y < h; y += 26) {
      d += `M-5 ${y}H${f(w * 0.25)}L${f(w * 0.33)} ${y + 9}H${f(w * 0.62)}L${f(w * 0.68)} ${y + 17}H${w + 5}`;
    }
    return d;
  },
  // Atlas mountains: nested rings around two peaks.
  granary_keeper(w, h) {
    let d = '';
    const peak = (cx, cy) => {
      for (let i = 1; i <= 9; i++) {
        const rx = i * 0.07 * w;
        const ry = i * 0.05 * w;
        d += `M${f(cx - rx)} ${f(cy)}C${f(cx - rx)} ${f(cy - ry * 1.3)} ${f(cx + rx * 0.7)} ${f(cy - ry * 1.4)} ${f(cx + rx)} ${f(cy)}C${f(cx + rx)} ${f(cy + ry * 1.2)} ${f(cx - rx * 0.8)} ${f(cy + ry * 1.3)} ${f(cx - rx)} ${f(cy)}Z`;
      }
    };
    peak(w * 0.3, h * 0.3);
    peak(w * 0.75, h * 0.75);
    return d;
  },
  // Dry riverbed: a winding channel between banks.
  rain_reader(w, h) {
    let d = '';
    const mid = w * 0.5;
    for (let y = 12; y < h; y += 24) {
      d += `M-5 ${y}C${f(w * 0.2)} ${y + 4} ${f(w * 0.32)} ${y - 4} ${f(mid - w * 0.08)} ${y}M${f(mid + w * 0.1)} ${y}C${f(w * 0.72)} ${y + 4} ${f(w * 0.86)} ${y - 4} ${w + 5} ${y}`;
    }
    for (const o of [-8, 0, 8]) {
      d += `M${f(mid + o)} -5C${f(mid - w * 0.12 + o)} ${f(h * 0.2)} ${f(mid + w * 0.15 + o)} ${f(h * 0.4)} ${f(mid + o)} ${f(h * 0.56)}S${f(mid - w * 0.12 + o)} ${f(h * 0.86)} ${f(mid + 4 + o)} ${h + 5}`;
    }
    return d;
  },
  // Rift escarpment: lines crowd together at the scarp, then open plain.
  elder(w, h) {
    let d = '';
    let y = 6;
    while (y < h) {
      d += `M-5 ${f(y)}C${f(w * 0.3)} ${f(y + 3)} ${f(w * 0.7)} ${f(y - 3)} ${w + 5} ${f(y)}`;
      y += y > h * 0.38 && y < h * 0.56 ? 4 : 18;
    }
    return d;
  },
};

export default function StageTerrain({ stageId = 'herder', width = 480, height = 420, color = 'var(--bone)', opacity = 0.1 }) {
  const draw = TERRAINS[stageId] ?? TERRAINS.herder;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <path d={draw(width, height)} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" opacity={opacity} />
    </svg>
  );
}
