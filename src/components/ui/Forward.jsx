import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import StageTerrain from './StageTerrain';

/**
 * Building blocks of the newer, rounder look the journey screens use:
 * the ink header, soft cards, pill buttons, the route progress bar and the
 * segmented switch. Kept apart from the hairline `Card` family in
 * Surface.jsx so the two looks don't blur while both are in the app.
 */

/** Ink-green band at the top of a screen, with the member's stage terrain behind its content. */
export function InkHeader({ stageId, children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface-ink)', borderRadius: '0 0 28px 28px', padding: '24px 22px 22px', color: 'var(--text-on-ink)' }}>
      <StageTerrain stageId={stageId} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/** InkHeader for an inner screen: a back button and the screen's title, with an optional line under it. */
export function InkBackHeader({ stageId, title, to, note }) {
  const navigate = useNavigate();
  return (
    <InkHeader stageId={stageId}>
      <button
        type="button"
        onClick={() => navigate(to)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-on-ink)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '0.12em' }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(245,238,226,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={18} color="var(--text-on-ink)" />
        </span>
        {title}
      </button>
      {note && <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--taupe-on-ink)' }}>{note}</div>}
    </InkHeader>
  );
}

/** Rounded card with a soft shadow and no border. Clickable when given onClick. */
export function SoftCard({ padding = '18px 20px', onClick, style, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick && { type: 'button', onClick })}
      style={{
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        background: 'var(--surface-card)',
        border: 'none',
        borderRadius: 20,
        padding,
        boxShadow: 'var(--shadow-md)',
        ...(onClick && { cursor: 'pointer' }),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

const PILL = {
  ink: { background: 'var(--ink-green)', color: 'var(--text-on-ink)', border: 'none' },
  gold: { background: 'var(--ochre-gold)', color: 'var(--earth-900)', border: 'none' },
  outlineOnInk: { background: 'transparent', color: 'var(--text-on-ink)', border: '1.5px solid rgba(245,238,226,0.6)' },
};

/**
 * Full-height pill button. `disabled` is for actions that exist in the
 * design but aren't switched on yet: it stays visible, greyed, and can't
 * be pressed.
 */
export function PillButton({ variant = 'ink', icon, onClick, disabled = false, style, children }) {
  const look = PILL[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 20px',
        borderRadius: 26,
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        ...look,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} color={look.color} accent={look.color} />}
      {children}
    </button>
  );
}

/**
 * Progress drawn as the brand's route: a dashed line to walk, the stretch
 * already covered in solid, a hollow waypoint where the member stands and
 * a faint one at the destination. `value` is 0–1 and is clamped.
 */
export function RouteBar({ value, onInk = false }) {
  const pct = Math.max(0, Math.min(1, value ?? 0)) * 100;
  const track = onInk ? 'rgba(245,238,226,0.4)' : 'var(--sand-line)';
  return (
    <div style={{ position: 'relative', height: 14, margin: '0 5px' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 6, borderTop: `2px dashed ${track}` }} />
      <div style={{ position: 'absolute', left: 0, width: `${pct}%`, top: 6, borderTop: `2px solid ${onInk ? 'var(--text-on-ink)' : 'var(--ink-green)'}` }} />
      <div style={{ position: 'absolute', right: -5, top: 2, width: 7, height: 7, borderRadius: 6, border: `1.5px solid ${track}`, background: onInk ? 'var(--surface-ink)' : 'var(--surface-card)' }} />
      <div style={{ position: 'absolute', left: `calc(${pct}% - 7px)`, top: 0, width: 10, height: 10, borderRadius: 7, border: '2px solid var(--ochre-gold)', background: onInk ? 'var(--surface-ink)' : 'var(--surface-card)' }} />
    </div>
  );
}

/** A row of mutually exclusive choices on an ink background. `options` is [{ value, label }]. */
export function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', flexWrap: 'wrap', background: 'rgba(245,238,226,0.12)', borderRadius: 18, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              minWidth: 52,
              minHeight: 32,
              padding: '0 10px',
              border: 'none',
              borderRadius: 15,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.06em',
              background: on ? 'var(--text-on-ink)' : 'transparent',
              color: on ? 'var(--ink-green)' : 'var(--text-on-ink)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Round icon button with its label underneath, for the shortcut row. */
export function Shortcut({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <span style={{ width: 54, height: 54, borderRadius: 27, background: 'var(--surface-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} />
      </span>
      <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-heading)', textAlign: 'center' }}>{label}</span>
    </button>
  );
}

/** Small rounded tag. Pass `background` and `color` to tint it. */
export function Tag({ background = 'var(--surface-panel)', color = 'var(--ink-green)', children }) {
  return <span style={{ flex: 'none', fontWeight: 600, fontSize: 10, letterSpacing: '0.08em', color, background, borderRadius: 10, padding: '3px 8px' }}>{children}</span>;
}
