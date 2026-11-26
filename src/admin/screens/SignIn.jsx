import { useState } from 'react';
import { auth } from '../api.js';
import { Btn, Field, Notice } from '../ui.jsx';

/**
 * The console uses the same login as the member app (password, then PIN).
 * Only a member given a staff role (scripts/make-staff.sh) gets past it.
 */
export default function SignIn({ me, onDone }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const step = !me.authenticated ? 'password' : me.requiresPin ? 'pin' : 'not-staff';

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await auth.signIn(username.trim(), password);
    setBusy(false);
    if (!r.ok) return setError(r.data?.error || 'Could not sign in');
    setPassword('');
    onDone();
  };

  const submitPin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await auth.enterPin(pin);
    setBusy(false);
    setPin('');
    if (!r.ok) {
      if (r.data?.locked) {
        setError('Too many wrong PINs — signed out. Sign in again.');
        return onDone();
      }
      return setError(r.data?.attemptsLeft != null ? `Wrong PIN — ${r.data.attemptsLeft} attempts left` : r.data?.error || 'Wrong PIN');
    }
    onDone();
  };

  const switchAccount = async () => {
    await auth.signOut();
    setError(null);
    onDone();
  };

  return (
    <div className="signin">
      <div className="signin-card">
        <h1>NOMAD ADMIN</h1>
        {me.offline && <Notice tone="danger">Couldn't reach the server. Check your connection and reload.</Notice>}

        {step === 'password' && (
          <form className="form form-1" onSubmit={submitPassword}>
            <p>Sign in with your Nomad username and password.</p>
            <Field label="Username">
              <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <Btn type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Continue'}
            </Btn>
          </form>
        )}

        {step === 'pin' && (
          <form className="form form-1" onSubmit={submitPin}>
            <p>
              Enter the PIN for <strong>{me.username}</strong>.
            </p>
            <Field label="PIN">
              <input
                className="pin-input"
                inputMode="numeric"
                type="password"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoFocus
                required
              />
            </Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <Btn type="submit" disabled={busy || pin.length !== 4}>
              {busy ? 'Checking…' : 'Unlock'}
            </Btn>
            <button type="button" className="link-btn" onClick={switchAccount}>
              Use a different account
            </button>
          </form>
        )}

        {step === 'not-staff' && (
          <>
            <Notice tone="warning">
              <strong>{me.username}</strong> doesn't have admin access. Grant it with <code>scripts/make-staff.sh</code>, then reload.
            </Notice>
            <Btn variant="outline" onClick={switchAccount}>
              Sign in as someone else
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
