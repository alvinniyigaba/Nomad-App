import { useState } from 'react';

/**
 * Button — Nomad's editorial call-to-action.
 * Matte fills, restrained motion (slight compress on press), uppercase tracked label.
 */
export default function Button({
  variant = 'primary', // 'primary' | 'gold' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  theme = 'light', // 'light' | 'ink'
  full = false,
  disabled = false,
  children,
  style = {},
  onClick,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const pads = { sm: '9px 18px', md: '13px 26px', lg: '17px 38px' };
  const fss = { sm: 11, md: 12, lg: 13 };
  const onInk = theme === 'ink';
  const palettes = {
    primary: { bg: 'var(--ink-green)', fg: 'var(--bone)', bd: 'transparent', bgHover: 'var(--ink-green-deep)' },
    gold: { bg: 'var(--ochre-gold)', fg: 'var(--ink-green)', bd: 'transparent', bgHover: 'var(--ochre-soft)' },
    outline: {
      bg: 'transparent',
      fg: onInk ? 'var(--sage-200)' : 'var(--ink-green)',
      bd: onInk ? 'var(--sage-400)' : 'var(--ink-green)',
      bgHover: onInk ? 'rgba(245,238,226,0.08)' : 'rgba(31,74,71,0.06)',
    },
    ghost: {
      bg: 'transparent',
      fg: onInk ? 'var(--sage-400)' : 'var(--text-body)',
      bd: 'transparent',
      bgHover: onInk ? 'rgba(245,238,226,0.06)' : 'rgba(31,74,71,0.05)',
    },
  };
  const p = palettes[variant] || palettes.primary;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--w-medium)',
        fontSize: fss[size],
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: pads[size],
        borderRadius: 'var(--radius-sm)',
        background: hover && !disabled ? p.bgHover : p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: press && !disabled ? 'scale(0.98)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
