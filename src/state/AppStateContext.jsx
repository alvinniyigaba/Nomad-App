import { createContext, useContext, useMemo, useState } from 'react';
import { borrow, withdrawSource, savings } from '../data/mockData';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loanAmount, setLoanAmount] = useState(300000);
  const [wd, setWd] = useState(45000);
  const [dest, setDest] = useState('mpesa');
  const [autoSave, setAutoSave] = useState(true);
  const [emailStatements, setEmailStatements] = useState(true);
  const [faceId, setFaceId] = useState(true);
  const [push, setPush] = useState(true);

  const value = useMemo(
    () => ({
      authenticated,
      login: () => setAuthenticated(true),
      logout: () => setAuthenticated(false),

      loanAmount,
      setLoanAmount,
      borrowLimit: borrow.availableLimit,

      wd,
      setWd,
      withdrawAvailable: withdrawSource.available,
      dest,
      setDest,

      autoSave,
      toggleAutoSave: () => setAutoSave((v) => !v),
      emailStatements,
      toggleEmailStatements: () => setEmailStatements((v) => !v),
      faceId,
      toggleFaceId: () => setFaceId((v) => !v),
      push,
      togglePush: () => setPush((v) => !v),

      savingsGoal: savings.goals[0],
    }),
    [authenticated, loanAmount, wd, dest, autoSave, emailStatements, faceId, push],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
