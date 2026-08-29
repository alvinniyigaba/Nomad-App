import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import TerrainPattern from '../components/ds/TerrainPattern';
import Button from '../components/ds/Button';
import { useAppState } from '../state/AppStateContext';

function fieldStyle(focused) {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'transparent',
    border: 'none',
    borderBottom: `1.5px solid ${focused ? 'var(--accent-gold)' : 'rgba(199,183,156,0.3)'}`,
    outline: 'none',
    padding: '10px 0',
    fontFamily: 'var(--font-sans)',
    fontWeight: 300,
    fontSize: 16,
    color: 'var(--text-on-ink)',
  };
}

export default function PasswordScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAppState();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password || submitting) return;
    setSubmitting(true);
    setError('');
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-ink)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <TerrainPattern theme="ink" width={480} height={960} showRoute={false} contourOpacity={0.09} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="nomad-scroll"
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          overflowY: 'auto',
          padding: '64px 26px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NomadLogo brand="group" layout="horizontal" theme="ink" size={13} />

        <div style={{ marginTop: 36, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 21, letterSpacing: '0.05em', color: 'var(--text-on-ink)' }}>
          SIGN IN
        </div>
        <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: 'var(--text-on-ink-body)' }}>
          Enter your username and password to continue.
        </div>

        <div style={{ marginTop: 38 }}>
          <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>
            Username
          </div>
          <input
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={() => setFocus('username')}
            onBlur={() => setFocus(null)}
            style={{ marginTop: 10, ...fieldStyle(focus === 'username') }}
          />
        </div>

        <div style={{ marginTop: 26 }}>
          <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>
            Password
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocus('password')}
            onBlur={() => setFocus(null)}
            style={{ marginTop: 10, ...fieldStyle(focus === 'password') }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 16, fontWeight: 400, fontSize: 12, color: 'var(--accent-clay)' }}>{error}</div>
        )}

        <div style={{ marginTop: 32 }}>
          <Button variant="gold" size="lg" full theme="ink" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Continue'}
          </Button>
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />
        <div style={{ textAlign: 'center', fontWeight: 300, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--sage-600)' }}>
          Nomad Ventures LLP · Nairobi
        </div>
      </form>
    </div>
  );
}
