/**
 * Badge — small uppercase tracked label. Used for sub-brand descriptors
 * (clay text) and status/section tags (solid or outline).
 */
export default function Badge({
  variant = 'descriptor', // 'descriptor' | 'solid' | 'gold' | 'outline'
  children,
  style = {},
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--w-medium)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: 'var(--ls-tag)',
    textTransform: 'uppercase',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
  const skins = {
    descriptor: { color: 'var(--accent-clay)', padding: 0, background: 'none', border: 'none' },
    solid: { color: 'var(--bone)', background: 'var(--ink-green)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none' },
    gold: { color: 'var(--ink-green)', background: 'var(--ochre-gold)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none' },
    outline: { color: 'var(--text-muted)', background: 'transparent', padding: '5px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' },
  };
  return (
    <span style={{ ...base, ...skins[variant], ...style }} {...rest}>
      {children}
    </span>
  );
}
