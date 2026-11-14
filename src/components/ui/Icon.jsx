/**
 * The app's icon set, drawn from the brand's own marks: the hollow
 * waypoint, the contour line and the route. 1.6px strokes on a 24px grid.
 * An icon never stands alone — always pair it with a text label.
 *
 * Each entry is [path, waypoint?] where waypoint is [cx, cy, r]: the small
 * hollow circle that takes the accent colour.
 */
const ICONS = {
  home: ['M4 11 L12 4 L20 11 M6 9.5 V20 H18 V9.5', [12, 15, 2.2]],
  save: ['M5 10 L12 4 L19 10 M6.5 10 V19 C6.5 20.2 17.5 20.2 17.5 19 V10', [12, 14.5, 2.2]],
  borrow: ['M4 8 H17 M14 5 L17 8 L14 11 M20 16 H7 M10 13 L7 16 L10 19'],
  invest: ['M3 20 H21 M3 17 C7 15 8 11 12 11 C15 11 16 8 18 6.6', [19.5, 5.5, 2]],
  journey: ['M4 20 C9 18 5 13 10 12 C15 11 13 6 17.5 5.6', [19.5, 5, 2]],
  add: ['M12 6 V18 M6 12 H18'],
  withdraw: ['M12 13 V3 M9 6 L12 3 L15 6 M5 13 V20 H19 V13'],
  goals: ['M6 21 V4 H17 L14.5 7.5 L17 11 H6'],
  statements: ['M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z M9 4 V18 M15 6 V20'],
  balance: ['M12 4 V19 M7 19 H17 M5 7 H19 M5 7 L3 12 H7 Z M19 7 L17 12 H21 Z'],
  back: ['M19 12 H5 M11 6 L5 12 L11 18'],
  forward: ['M9 6 L15 12 L9 18'],
};

export default function Icon({ name, size = 22, color = 'var(--ink-green)', accent = 'var(--ochre-gold)' }) {
  const [d, waypoint] = ICONS[name];
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', display: 'block' }}>
      <path d={d} />
      {waypoint && <circle cx={waypoint[0]} cy={waypoint[1]} r={waypoint[2]} stroke={accent} />}
    </svg>
  );
}
