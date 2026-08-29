import { Navigate } from 'react-router-dom';
import PasswordScreen from './PasswordScreen';
import PinScreen from './PinScreen';
import { useAppState } from '../state/AppStateContext';

// The /login route's content depends on real session state: a brand-new
// device sees the password form, a known device sees the PIN keypad, and
// an already-unlocked session skips straight past both.
export default function LoginGate() {
  const { authStatus } = useAppState();

  if (authStatus === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-ink)' }} />;
  }
  if (authStatus === 'authenticated') return <Navigate to="/home" replace />;
  if (authStatus === 'needsPin') return <PinScreen />;
  return <PasswordScreen />;
}
