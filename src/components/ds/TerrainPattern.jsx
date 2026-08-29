/**
 * TerrainPattern — the brand's topographic motif: nested elevation contours
 * with a single dashed ochre "route" finding the pass through.
 * Deterministic (no randomness) so it renders identically everywhere.
 */
function contour(cx, cy, r, phase, squash) {
  const N = 40;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(3 * a + phase) + 0.09 * Math.cos(5 * a + phase * 1.7) + 0.05 * Math.sin(7 * a + phase * 0.6);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * squash]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export default function TerrainPattern({
  theme = 'ink', // 'ink' (light lines on green) | 'light' (earth lines on bone)
  width = 1360,
  height = 640,
  lineColor,
  routeColor = 'var(--ochre-gold)',
  contourOpacity,
  showRoute = true,
  style = {},
  ...rest
}) {
  const onInk = theme === 'ink';
  const stroke = lineColor || (onInk ? '#E4D7C3' : 'var(--clay-soft)');
  const op = contourOpacity != null ? contourOpacity : onInk ? 0.1 : 0.16;

  const peaks = [
    { cx: width * 0.26, cy: height * 0.62, phase: 0.6, squash: 0.72, rings: 8, step: 34, r0: 26 },
    { cx: width * 0.74, cy: height * 0.4, phase: 2.3, squash: 0.66, rings: 11, step: 30, r0: 20 },
    { cx: width * 0.5, cy: height * 0.92, phase: 4.1, squash: 0.6, rings: 5, step: 40, r0: 30 },
  ];

  const passX = width * 0.5;
  const passY = height * 0.5;
  const route =
    `M${width * 0.05},${height * 0.86} ` +
    `C ${width * 0.2},${height * 0.8} ${width * 0.22},${height * 0.62} ${width * 0.36},${height * 0.58} ` +
    `C ${width * 0.46},${height * 0.55} ${passX - 30},${passY + 20} ${passX},${passY} ` +
    `C ${passX + 34},${passY - 22} ${width * 0.62},${height * 0.34} ${width * 0.76},${height * 0.34} ` +
    `C ${width * 0.88},${height * 0.34} ${width * 0.9},${height * 0.5} ${width * 0.97},${height * 0.48}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      aria-hidden="true"
      {...rest}
    >
      <g fill="none" stroke={stroke} strokeWidth="1" opacity={op} strokeLinejoin="round">
        {peaks.map((p, pi) =>
          Array.from({ length: p.rings }).map((_, i) => (
            <path
              key={pi + '-' + i}
              d={contour(p.cx, p.cy, p.r0 + i * p.step, p.phase + i * 0.12, p.squash)}
              strokeWidth={i === 0 ? 1.3 : 1}
              opacity={i === 0 ? 1 : 0.9 - i * 0.03}
            />
          )),
        )}
      </g>
      {showRoute && (
        <g>
          <path
            d={route}
            fill="none"
            stroke={routeColor}
            strokeWidth="1.8"
            strokeDasharray="1.6 9"
            strokeLinecap="round"
          />
          <circle cx={passX} cy={passY} r="8" fill="none" stroke={routeColor} strokeWidth="2" />
          <circle cx={passX} cy={passY} r="2.6" fill={routeColor} />
          <circle cx={width * 0.05} cy={height * 0.86} r="4" fill={routeColor} />
          <circle cx={width * 0.97} cy={height * 0.48} r="4" fill="none" stroke={routeColor} strokeWidth="1.6" />
        </g>
      )}
    </svg>
  );
}
