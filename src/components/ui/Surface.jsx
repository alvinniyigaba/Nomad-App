import TerrainPattern from '../ds/TerrainPattern';

/** Terrain contours laid behind a card's content. Takes TerrainPattern's props. */
export function TerrainBackdrop(props) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <TerrainPattern {...props} />
    </div>
  );
}

/** The standard light card: warm surface, sand hairline, soft shadow. Clickable when given onClick. */
export function Card({ padding = 20, top, onClick, style, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...(top != null && { marginTop: top }),
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding,
        boxShadow: 'var(--shadow-sm)',
        ...style,
        ...(onClick && { cursor: 'pointer' }),
      }}
    >
      {children}
    </div>
  );
}

/** The ink-green hero card with the terrain pattern behind its content. */
export function InkCard({ top = 20, terrainHeight = 200, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        marginTop: top,
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface-ink)',
        border: '1px solid rgba(201,138,43,0.28)',
        borderRadius: 8,
        padding: 20,
        boxShadow: 'var(--shadow-md)',
        ...(onClick && { cursor: 'pointer' }),
      }}
    >
      <TerrainBackdrop theme="ink" width={360} height={terrainHeight} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/** Vertical list of cards or rows with even gaps. */
export function Stack({ top = 12, gap = 10, children }) {
  return <div style={{ marginTop: top, display: 'flex', flexDirection: 'column', gap }}>{children}</div>;
}

/** Thin progress bar. `pct` is 0–100. */
export function ProgressBar({ pct, top, height = 6, radius = height / 2, track = 'var(--bone-panel)', fill = 'var(--ink-green)' }) {
  return (
    <div style={{ ...(top != null && { marginTop: top }), height, background: track, ...(radius && { borderRadius: radius, overflow: 'hidden' }) }}>
      <div style={{ width: `${pct}%`, height, background: fill }} />
    </div>
  );
}
