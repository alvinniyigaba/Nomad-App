/**
 * Page-level building blocks every screen shares: the padded page body,
 * the Cinzel screen title, and the "← TITLE" / "✕ TITLE" header that
 * leaves a screen.
 */
const TITLE_STYLE = { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' };

export function Screen({ children }) {
  return <div style={{ padding: '0 22px 28px' }}>{children}</div>;
}

export function ScreenTitle({ children }) {
  return <div style={TITLE_STYLE}>{children}</div>;
}

/** `close` shows ✕ instead of ← — for flows you dismiss (add money, withdraw, new goal) rather than step back from. */
export function BackTitle({ onBack, close = false, children }) {
  return (
    <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div style={{ fontWeight: 300, fontSize: close ? 19 : 20, color: 'var(--text-muted)', lineHeight: 1 }}>{close ? '✕' : '←'}</div>
      <ScreenTitle>{children}</ScreenTitle>
    </div>
  );
}
