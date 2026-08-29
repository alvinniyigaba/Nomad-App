import Button from './ds/Button';

export function Loading({ label = 'Loading…' }) {
  return (
    <div style={{ padding: '80px 22px', textAlign: 'center', fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>
      {label}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div style={{ padding: '60px 22px', textAlign: 'center' }}>
      <div style={{ fontWeight: 300, fontSize: 13, color: 'var(--accent-clay)', marginBottom: 20 }}>{message}</div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
