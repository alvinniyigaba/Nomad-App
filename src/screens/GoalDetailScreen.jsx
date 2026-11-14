import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { rates } from '../data/mockData';
import { fromMinor, formatMonthYear, formatDayMonth, capitalize } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { paceStatus } from '../utils/pacing';
import { useAccounts } from '../hooks/useAccounts';
import { ActionLabel, Amount, BackTitle, Card, Eyebrow, ItemMeta, ItemTitle, ProgressBar, Screen, Stack } from '../components/ui';

const KIND_LABEL = { auto_save: 'Auto-save', topup: 'Top-up', interest: 'Interest', withdrawal: 'Withdrawal', adjustment: 'Adjustment' };

export default function GoalDetailScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const { status, goal: individualGoal, accounts, error, refetch } = useAccounts();
  const { fmt, ksh } = useMoney();
  const [savingAutoSave, setSavingAutoSave] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const accountId = searchParams.get('account');
  const goal = (accountId ? accounts.find((a) => a.id === accountId) : individualGoal) ?? individualGoal;
  if (!goal) return <ErrorState message="Goal not found" onRetry={refetch} />;

  const balance = fromMinor(goal.balanceMinor);
  const target = fromMinor(goal.targetMinor);
  const pledged = fromMinor(goal.pledgedMinor);
  const interestEarned = fromMinor(goal.interestEarnedMinor);
  const pace = paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor });

  async function toggleAutoSave() {
    setSavingAutoSave(true);
    await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: goal.id, autoSaveEnabled: !goal.autoSaveEnabled }),
    });
    await refetch();
    setSavingAutoSave(false);
  }

  const canClose = BigInt(goal.balanceMinor) === 0n && (!goal.isGroup || goal.myRole === 'admin');
  const canSeeClose = !goal.isGroup || goal.myRole === 'admin';

  async function closeGoal() {
    if (!window.confirm(`Close "${goal.name}"? It'll drop off your Home and Savings screens — its history stays on record.`)) return;
    setClosing(true);
    setCloseError('');
    const res = await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: goal.id, closeGoal: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCloseError(data.error ?? 'Could not close this goal');
      setClosing(false);
      return;
    }
    navigate('/save');
  }

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <BackTitle onBack={() => navigate('/save')}>
          {goal.name.toUpperCase()}
        </BackTitle>
        <HideBalancesButton />
      </div>

      <Amount top={22}>{ksh(balance)}</Amount>
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>
        of {ksh(target)} · target {formatMonthYear(goal.targetDate)}
      </div>
      <ProgressBar top={18} pct={Math.min(100, pace?.pctFunded ?? 0)} height={8} />
      <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{pace?.pctFunded ?? 0}% funded</span>
        {pace?.behindMinor > 0 && <span style={{ color: 'var(--accent-clay)' }}>{ksh(pace.behindMinor / 100)} behind pace</span>}
        {pace?.aheadMinor > 0 && <span style={{ color: 'var(--success)' }}>{ksh(pace.aheadMinor / 100)} ahead of pace</span>}
      </div>

      <div style={{ marginTop: 22, display: 'flex', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ flex: 1, padding: '16px 0', borderRight: '1px solid var(--border-default)' }}>
          <Eyebrow tone="faint" tracking="0.18em">Interest earned</Eyebrow>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(interestEarned)}</div>
        </div>
        <div style={{ flex: 1, padding: '16px 0 16px 20px' }}>
          <Eyebrow tone="faint" tracking="0.18em">Rate</Eyebrow>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{savingsRateLabel}</div>
        </div>
      </div>

      {goal.isGroup && (
        <Card padding="18px 20px" top={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ItemTitle>Group goal</ItemTitle>
            <Badge variant={goal.myRole === 'admin' ? 'solid' : 'outline'}>{goal.myRole === 'admin' ? 'You’re an admin' : 'Member'}</Badge>
          </div>
          <Stack top={14}>
            {goal.members.map((m) => (
              <div key={m.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)', textTransform: 'capitalize' }}>{capitalize(m.username)}</span>
                  {m.role === 'admin' && <span style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Admin</span>}
                </div>
                <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{ksh(fromMinor(m.contributionMinor))}</span>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      <Stack top={20}>
        {!goal.isGroup && (
          <Card padding="18px 20px" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <ItemTitle>Auto-save</ItemTitle>
              <ItemMeta>{ksh(fromMinor(goal.autoSaveAmountMinor))} · day {goal.autoSaveDay} of the month · {goal.autoSaveRail}</ItemMeta>
            </div>
            <Toggle on={goal.autoSaveEnabled} onClick={savingAutoSave ? undefined : toggleAutoSave} />
          </Card>
        )}
        {pledged > 0 && (
          <Card padding="18px 20px" onClick={() => navigate('/borrow')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <ItemTitle>Pledged against loan</ItemTitle>
              <ItemMeta>{ksh(pledged)} locked · still earning</ItemMeta>
            </div>
            <ActionLabel>VIEW</ActionLabel>
          </Card>
        )}
      </Stack>

      <Eyebrow top={24}>Activity</Eyebrow>
      {goal.activity.length === 0 && (
        <div style={{ padding: '15px 0', fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>Nothing yet.</div>
      )}
      {goal.activity.map((entry) => {
        const amount = fromMinor(entry.amountMinor);
        const positive = amount >= 0;
        return (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <ItemTitle size={13}>{entry.memo ?? KIND_LABEL[entry.kind]}</ItemTitle>
              <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>
                {formatDayMonth(entry.createdAt)}
                {entry.rail ? ` · ${entry.rail}` : ''}
              </div>
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, color: positive ? 'var(--success)' : 'var(--accent-clay)' }}>
              {positive ? '+' : ''}
              {fmt(amount)}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <Button variant="primary" size="md" full style={{ flex: 1 }} onClick={() => navigate(`/deposit?account=${goal.id}`)}>
          Top up
        </Button>
        <Button variant="outline" size="md" full style={{ flex: 1 }}>
          Edit goal
        </Button>
      </div>
      {canSeeClose && (
        <div style={{ marginTop: 10 }}>
          <Button variant="outline" size="md" full onClick={closeGoal} disabled={!canClose || closing}>
            {closing ? 'Closing…' : 'Close goal'}
          </Button>
          {!canClose && (
            <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>
              Withdraw the remaining balance to close this goal.
            </div>
          )}
          {closeError && <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: 'var(--accent-clay)' }}>{closeError}</div>}
        </div>
      )}
    </Screen>
  );
}
