import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { borrow } from '../data/mockData';

const AppStateContext = createContext(null);

async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function AppStateProvider({ children }) {
  // 'loading' | 'anon' | 'needsPin' | 'authenticated'
  const [authStatus, setAuthStatus] = useState('loading');
  const [user, setUser] = useState(null);

  const [loanAmount, setLoanAmount] = useState(300000);
  const [wd, setWd] = useState(45000);
  const [dest, setDest] = useState('mpesa');
  const [emailStatements, setEmailStatements] = useState(true);
  const [faceId, setFaceId] = useState(true);
  const [push, setPush] = useState(true);

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/auth/session');
    const data = await res.json().catch(() => ({ authenticated: false }));
    if (!data.authenticated) {
      setAuthStatus('anon');
      setUser(null);
    } else if (data.requiresPin) {
      setAuthStatus('needsPin');
      setUser(data.user);
    } else {
      setAuthStatus('authenticated');
      setUser(data.user);
    }
    return data;
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (username, password) => {
      const { ok, data } = await api('/api/auth/login', { username, password });
      if (!ok) return { ok: false, error: data.error ?? 'Login failed' };
      await refreshSession();
      return { ok: true };
    },
    [refreshSession],
  );

  const verifyPin = useCallback(async (pin) => {
    const { ok, data } = await api('/api/auth/pin', { pin });
    if (!ok) {
      if (data.locked) {
        setAuthStatus('anon');
        setUser(null);
      }
      return { ok: false, locked: !!data.locked, attemptsLeft: data.attemptsLeft };
    }
    setAuthStatus('authenticated');
    return { ok: true };
  }, []);

  const lockApp = useCallback(async () => {
    await api('/api/auth/lock');
    setAuthStatus('needsPin');
  }, []);

  const value = useMemo(
    () => ({
      authStatus,
      user,
      login,
      verifyPin,
      lockApp,

      loanAmount,
      setLoanAmount,
      borrowLimit: borrow.availableLimit,

      wd,
      setWd,
      dest,
      setDest,

      emailStatements,
      toggleEmailStatements: () => setEmailStatements((v) => !v),
      faceId,
      toggleFaceId: () => setFaceId((v) => !v),
      push,
      togglePush: () => setPush((v) => !v),
    }),
    [authStatus, user, login, verifyPin, lockApp, loanAmount, wd, dest, emailStatements, faceId, push],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
