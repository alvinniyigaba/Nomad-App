/**
 * The app's recurring text roles. Sizes and weights live here once so a
 * screen says what a piece of text is (an eyebrow, an amount, a list
 * item's title) instead of repeating its styling.
 */
const EYEBROW_TONE = { muted: 'var(--text-muted)', faint: 'var(--text-faint)', ink: 'var(--taupe-on-ink)' };

/** Small uppercase, wide-tracked label above a section or figure. `tone="ink"` on dark cards. */
export function Eyebrow({ tone = 'muted', tracking = '0.22em', top, bottom, children }) {
  return (
    <div
      style={{
        ...(top != null && { marginTop: top }),
        ...(bottom != null && { marginBottom: bottom }),
        fontWeight: 300,
        fontSize: 10,
        letterSpacing: tracking,
        textTransform: 'uppercase',
        color: EYEBROW_TONE[tone],
      }}
    >
      {children}
    </div>
  );
}

/** The headline figure of a screen or hero card. */
export function Amount({ top, color = 'var(--text-heading)', children }) {
  return (
    <div style={{ ...(top != null && { marginTop: top }), fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color }}>
      {children}
    </div>
  );
}

/** Title line of a card or list row. */
export function ItemTitle({ size = 14, children }) {
  return <div style={{ fontWeight: 400, fontSize: size, color: 'var(--text-heading)' }}>{children}</div>;
}

/** Supporting line under an ItemTitle. */
export function ItemMeta({ top = 5, children }) {
  return <div style={{ marginTop: top, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{children}</div>;
}

/** Tracked uppercase action word (VIEW, FUND, OPEN). Clickable when given onClick. */
export function ActionLabel({ onClick, children }) {
  return (
    <div onClick={onClick} style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', ...(onClick && { cursor: 'pointer' }) }}>
      {children}
    </div>
  );
}
