/**
 * Toggle — the ink-green pill switch used for settings across the app.
 */
export default function Toggle({ on, onClick, style = {}, ...rest }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 46,
        height: 27,
        borderRadius: 14,
        position: 'relative',
        flex: 'none',
        cursor: 'pointer',
        background: on ? 'var(--ink-green)' : 'var(--sand-line)',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          width: 21,
          height: 21,
          background: 'var(--bone)',
          borderRadius: 11,
          left: on ? 22 : 3,
        }}
      />
    </div>
  );
}
