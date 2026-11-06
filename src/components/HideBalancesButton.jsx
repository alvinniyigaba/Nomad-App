import { useMoney } from '../hooks/useMoney';

function EyeIcon({ crossed }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}

/**
 * Eye button that hides or shows every balance in the app at once. The
 * choice is remembered on this device. `tone="ink"` for the dark cards.
 */
export default function HideBalancesButton({ tone = 'light', style }) {
  const { hidden, toggle } = useMoney();
  const label = hidden ? 'Show balances' : 'Hide balances';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      style={{
        flex: 'none',
        width: 32,
        height: 32,
        margin: -7,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 16,
        cursor: 'pointer',
        color: tone === 'ink' ? 'var(--taupe-on-ink)' : 'var(--text-muted)',
        ...style,
      }}
    >
      <EyeIcon crossed={hidden} />
    </button>
  );
}
