import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { rates } from '../data/mockData';
import { fromMinor, formatMonthYear } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { paceStatus } from '../utils/pacing';
import { useAccounts } from '../hooks/useAccounts';
import { useAppState } from '../state/AppStateContext';
import { Amount, Card, Eyebrow, ItemMeta, ItemTitle, ProgressBar, Screen, ScreenTitle, Stack } from '../components/ui';

export default function SavingsScreen() {
  const navigate = useNavigate();
  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const { user } = useAppState();
  const { fmt, ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const goalBalance = fromMinor(goal?.balanceMinor ?? 0);
  const liquidBalance = fromMinor(liquid?.balanceMinor ?? 0);
  // Same "saved" as Home: own goal and liquid fund plus this member's own
  // share of each group goal (never the whole pool).
  const myGroupShare = groupGoals.reduce((sum, g) => sum + fromMinor(g.members.find((m) => m.username === user?.username)?.contributionMinor ?? 0), 0);
  const totalBalance = goalBalance + liquidBalance + myGroupShare;
  const pace = goal ? paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor }) : null;
  const pledged = fromMinor(goal?.pledgedMinor ?? 0);

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <ScreenTitle>SAVINGS</ScreenTitle>
        <HideBalancesButton />
      </div>
      <Amount top={18}>{ksh(totalBalance)}</Amount>
      {myGroupShare > 0 && <ItemMeta top={4}>Includes {fmt(myGroupShare)}, your share of group goals</ItemMeta>}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge variant="outline">{savingsRateLabel}</Badge>
        <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>Interest paid monthly</span>
      </div>

      <Stack top={24} gap={12}>
        {goal && (
          <Card onClick={() => navigate('/save/goal')}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <ItemTitle size={16}>{goal.name}</ItemTitle>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(goalBalance)}</div>
            </div>
            <ItemMeta top={6}>of {ksh(fromMinor(goal.targetMinor))} · {formatMonthYear(goal.targetDate)}</ItemMeta>
            <ProgressBar top={14} pct={Math.min(100, pace?.pctFunded ?? 0)} />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>{pace?.pctFunded ?? 0}% funded</span>
              {pace?.behindMinor > 0 && (
                <span style={{ color: 'var(--accent-clay)' }}>{ksh(pace.behindMinor / 100)} behind pace</span>
              )}
              {pace?.aheadMinor > 0 && <span style={{ color: 'var(--success)' }}>{ksh(pace.aheadMinor / 100)} ahead of pace</span>}
            </div>
          </Card>
        )}

        {liquid && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <ItemTitle size={16}>{liquid.name}</ItemTitle>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(liquidBalance)}</div>
            </div>
            <ItemMeta top={6}>No target · fully liquid</ItemMeta>
            <ProgressBar top={14} pct={100} fill="var(--savannah-sand)" />
            <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>Available to withdraw today</div>
          </Card>
        )}
      </Stack>

      {groupGoals.length > 0 && (
        <>
          <Eyebrow top={26}>Group goals</Eyebrow>
          <Stack gap={12}>
            {groupGoals.map((g) => {
              const gBalance = fromMinor(g.balanceMinor);
              const gPace = paceStatus({ createdAt: g.createdAt, targetDate: g.targetDate, targetMinor: g.targetMinor, balanceMinor: g.balanceMinor });
              return (
                <Card key={g.id} onClick={() => navigate(`/save/goal?account=${g.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ItemTitle size={16}>{g.name}</ItemTitle>
                      <Badge variant="outline">{g.myRole === 'admin' ? 'Admin' : 'Member'}</Badge>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(gBalance)}</div>
                  </div>
                  <ItemMeta top={6}>of {ksh(fromMinor(g.targetMinor))} · {formatMonthYear(g.targetDate)} · {g.members.length} members</ItemMeta>
                  <ProgressBar top={14} pct={Math.min(100, gPace?.pctFunded ?? 0)} />
                  <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>{gPace?.pctFunded ?? 0}% funded</div>
                </Card>
              );
            })}
          </Stack>
        </>
      )}

      {pledged > 0 && (
        <div style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 8, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 11, height: 11, border: '1.4px solid var(--accent-gold)', borderRadius: 6, flex: 'none' }} />
          <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-body)' }}>
            {ksh(pledged)} is pledged against your loan. It stays locked and keeps earning {savingsRateLabel}.
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Button variant="outline" size="md" full onClick={() => navigate('/save/new')}>
          Open a new goal
        </Button>
      </div>
    </Screen>
  );
}
