import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import AppShell from './components/AppShell';
import SplashScreen from './screens/SplashScreen';
import LoginGate from './screens/LoginGate';
import HomeScreen from './screens/HomeScreen';
import SavingsScreen from './screens/SavingsScreen';
import GoalDetailScreen from './screens/GoalDetailScreen';
import BorrowScreen from './screens/BorrowScreen';
import LoanScreen from './screens/LoanScreen';
import InvestScreen from './screens/InvestScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import StatementsScreen from './screens/StatementsScreen';
import KycScreen from './screens/KycScreen';
import ProfileScreen from './screens/ProfileScreen';

function RequireAuth({ children }) {
  const { authStatus } = useAppState();
  if (authStatus === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-ground)' }} />;
  }
  if (authStatus !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/splash" replace />} />
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<LoginGate />} />

      <Route
        path="/home"
        element={
          <RequireAuth>
            <AppShell>
              <HomeScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/save"
        element={
          <RequireAuth>
            <AppShell>
              <SavingsScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/save/goal"
        element={
          <RequireAuth>
            <AppShell>
              <GoalDetailScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/borrow"
        element={
          <RequireAuth>
            <AppShell>
              <BorrowScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/loan"
        element={
          <RequireAuth>
            <AppShell>
              <LoanScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/invest"
        element={
          <RequireAuth>
            <AppShell>
              <InvestScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/withdraw"
        element={
          <RequireAuth>
            <AppShell>
              <WithdrawScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/statements"
        element={
          <RequireAuth>
            <AppShell>
              <StatementsScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/kyc"
        element={
          <RequireAuth>
            <AppShell>
              <KycScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <AppShell>
              <ProfileScreen />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/splash" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppStateProvider>
  );
}
