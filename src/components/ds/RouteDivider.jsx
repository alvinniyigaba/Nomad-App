/**
 * RouteDivider — the signature dashed ochre "route" line with waypoint(s).
 * 'straight' is a stationery rule; 'wander' is a gently wandering pass line.
 * Hollow circle marks the start; filled circle marks arrival.
 */
export default function RouteDivider({
  variant = 'straight', // 'straight' | 'wander'
  color = 'var(--accent-gold)',
  width = 400,
  height,
  strokeWidth = 1.4,
  style = {},
  ...rest
}) {
  const h = height || (variant === 'wander' ? 56 : 12);
  const cy = h / 2;
  const dash = '1.5 8';
  const path =
    variant === 'wander'
      ? `M8,${h - 8} C ${width * 0.22},${h - 10} ${width * 0.24},${cy - 6} ${width * 0.42},${cy - 4} ` +
        `C ${width * 0.58},${cy - 2} ${width * 0.58},12 ${width * 0.76},12 ` +
        `C ${width * 0.9},12 ${width * 0.93},${cy} ${width - 8},${cy - 4}`
      : `M6,${cy} H ${width - 6}`;

  const wpx = variant === 'wander' ? width * 0.76 : width - 6;
  const wpy = variant === 'wander' ? 12 : cy;

  return (
    <svg
      viewBox={`0 0 ${width} ${h}`}
      width="100%"
      height={h}
      style={{ display: 'block', overflow: 'visible', ...style }}
      {...rest}
    >
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} strokeLinecap="round" />
      <circle cx={6} cy={cy} r={3} fill="none" stroke={color} strokeWidth={strokeWidth} />
      {variant === 'wander' && (
        <>
          <circle cx={wpx} cy={wpy} r={5} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <circle cx={wpx} cy={wpy} r={1.7} fill={color} />
        </>
      )}
      <circle cx={width - 6} cy={cy} r={3} fill={color} />
    </svg>
  );
}
