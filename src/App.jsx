import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider, useAppState } from './state/AppStateContext';
import { StageProvider } from './state/StageContext';
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
import DepositScreen from './screens/DepositScreen';
import CreateGoalScreen from './screens/CreateGoalScreen';
import PositionSummaryScreen from './screens/PositionSummaryScreen';
import StatementsScreen from './screens/StatementsScreen';
import KycScreen from './screens/KycScreen';
import ProfileScreen from './screens/ProfileScreen';
import JourneyHomeScreen from './screens/journey/JourneyHomeScreen';
import JourneyBorrowScreen from './screens/journey/JourneyBorrowScreen';
import JourneyInvestScreen from './screens/journey/JourneyInvestScreen';
import JourneySaveScreen from './screens/journey/JourneySaveScreen';
import JourneyScreen from './screens/journey/JourneyScreen';
import TrailScreen from './screens/journey/TrailScreen';
import BalanceSheetScreen from './screens/journey/BalanceSheetScreen';

function RequireAuth({ children }) {
  const { authStatus } = useAppState();
  if (authStatus === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-ground)' }} />;
  }
  if (authStatus !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}

/**
 * A route that differs for members in the journey preview. They get
 * `preview` (full-width, under its own ink header); everyone else gets
 * `fallback` in the standard shell, or is sent home when a screen exists
 * only in the preview. Must sit inside RequireAuth, so `user` is loaded.
 */
function JourneyPreview({ preview, fallback = null }) {
  const { user } = useAppState();
  if (user?.features?.journey) return <AppShell flush>{preview}</AppShell>;
  return fallback ? <AppShell>{fallback}</AppShell> : <Navigate to="/home" replace />;
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
            <JourneyPreview preview={<JourneyHomeScreen />} fallback={<HomeScreen />} />
          </RequireAuth>
        }
      />
      <Route
        path="/save"
        element={
          <RequireAuth>
            <JourneyPreview preview={<JourneySaveScreen />} fallback={<SavingsScreen />} />
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
            <JourneyPreview preview={<JourneyBorrowScreen />} fallback={<BorrowScreen />} />
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
            <JourneyPreview preview={<JourneyInvestScreen />} fallback={<InvestScreen />} />
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
        path="/position"
        element={
          <RequireAuth>
            <AppShell>
              <PositionSummaryScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/save/new"
        element={
          <RequireAuth>
            <AppShell>
              <CreateGoalScreen />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/deposit"
        element={
          <RequireAuth>
            <AppShell>
              <DepositScreen />
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

      <Route
        path="/journey"
        element={
          <RequireAuth>
            <JourneyPreview preview={<JourneyScreen />} />
          </RequireAuth>
        }
      />
      <Route
        path="/trail"
        element={
          <RequireAuth>
            <JourneyPreview preview={<TrailScreen />} />
          </RequireAuth>
        }
      />
      <Route
        path="/balance-sheet"
        element={
          <RequireAuth>
            <JourneyPreview preview={<BalanceSheetScreen />} />
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
      <StageProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StageProvider>
    </AppStateProvider>
  );
}
