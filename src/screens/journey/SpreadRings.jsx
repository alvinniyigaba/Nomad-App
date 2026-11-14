import { percent } from './format';

// Where each ring's marker sits: home at the centre, the region on the
// second ring to the right, the world on the outer ring to the upper left.
const CX = 173;
const CY = 146;
const SPOT = {
  home: { x: CX, y: CY, labelDy: 40 },
  region: { x: CX + 92, y: CY + 4, labelDy: 36 },
  world: { x: CX - 96, y: CY - 86, labelDy: -20 },
};

/**
 * A member's spread drawn as contour rings around home: a bubble on each
 * ring sized by how much sits there (area-true), joined to home by the
 * dashed route. Rings with nothing in them stay empty. For ink backgrounds.
 */
export default function SpreadRings({ rings }) {
  const summary = rings.map((r) => `${percent(r.share)} ${r.label.toLowerCase()}`).join(', ');
  return (
    <svg role="img" aria-label={`Your spread: ${summary}`} viewBox="0 0 346 290" style={{ display: 'block', width: '100%' }}>
      <circle cx={CX} cy={CY} r="46" fill="none" stroke="#F5EEE2" strokeWidth="1" opacity="0.4" />
      <circle cx={CX} cy={CY} r="92" fill="none" stroke="#F5EEE2" strokeWidth="1" opacity="0.28" strokeDasharray="3 4" />
      <circle cx={CX} cy={CY} r="130" fill="none" stroke="#F5EEE2" strokeWidth="1" opacity="0.2" strokeDasharray="1.5 5" />
      {rings
        .filter((r) => r.id !== 'home' && r.valueMinor > 0)
        .map((r) => (
          <path key={r.id} d={`M${CX} ${CY}L${SPOT[r.id].x} ${SPOT[r.id].y}`} stroke="#C98A2B" strokeWidth="1.5" strokeDasharray="4 4" />
        ))}
      {rings.map((r) => {
        const spot = SPOT[r.id];
        const home = r.id === 'home';
        return (
          <g key={r.id} opacity={r.valueMinor > 0 ? 1 : 0.45}>
            {r.valueMinor > 0 && <circle cx={spot.x} cy={spot.y} r={Math.max(6, 36 * Math.sqrt(r.share))} fill={home ? '#C98A2B' : '#F5EEE2'} opacity={home ? 0.32 : 0.16} />}
            <circle cx={spot.x} cy={spot.y} r={home ? 7 : 5} fill="#1F4A47" stroke={home ? '#C98A2B' : '#F5EEE2'} strokeWidth={home ? 2.2 : 1.8} />
            <text x={spot.x} y={spot.y + spot.labelDy} textAnchor="middle" fontFamily="Cinzel, serif" fontSize="12" fontWeight="600" fill="#F5EEE2">
              {r.label.toUpperCase()} {percent(r.share)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
