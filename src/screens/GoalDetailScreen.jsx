import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { rates } from '../data/mockData';
import { fmt, ksh, fromMinor, formatMonthYear, formatDayMonth, capitalize } from '../utils/format';
import { paceStatus } from '../utils/pacing';
import { useAccounts } from '../hooks/useAccounts';

const KIND_LABEL = { auto_save: 'Auto-save', topup: 'Top-up', interest: 'Interest', withdrawal: 'Withdrawal', adjustment: 'Adjustment' };

export default function GoalDetailScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const { status, goal: individualGoal, accounts, error, refetch } = useAccounts();
  const [savingAutoSave, setSavingAutoSave] = useState(false);

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

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/save')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          {goal.name.toUpperCase()}
        </div>
      </div>

      <div style={{ marginTop: 22, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(balance)}
      </div>
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>
        of {ksh(target)} · target {formatMonthYear(goal.targetDate)}
      </div>
      <div style={{ marginTop: 18, height: 8, background: 'var(--bone-panel)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: Math.min(100, pace?.pctFunded ?? 0) + '%', height: 8, background: 'var(--ink-green)' }} />
      </div>
      <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{pace?.pctFunded ?? 0}% funded</span>
        {pace?.behindMinor > 0 && <span style={{ color: 'var(--accent-clay)' }}>{ksh(pace.behindMinor / 100)} behind pace</span>}
        {pace?.aheadMinor > 0 && <span style={{ color: 'var(--success)' }}>{ksh(pace.aheadMinor / 100)} ahead of pace</span>}
      </div>

      <div style={{ marginTop: 22, display: 'flex', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ flex: 1, padding: '16px 0', borderRight: '1px solid var(--border-default)' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Interest earned</div>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(interestEarned)}</div>
        </div>
        <div style={{ flex: 1, padding: '16px 0 16px 20px' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Rate</div>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{savingsRateLabel}</div>
        </div>
      </div>

      {goal.isGroup && (
        <div style={{ marginTop: 20, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Group goal</div>
            <Badge variant={goal.myRole === 'admin' ? 'solid' : 'outline'}>{goal.myRole === 'admin' ? 'You’re an admin' : 'Member'}</Badge>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goal.members.map((m) => (
              <div key={m.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)', textTransform: 'capitalize' }}>{capitalize(m.username)}</span>
                  {m.role === 'admin' && <span style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Admin</span>}
                </div>
                <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{ksh(fromMinor(m.contributionMinor))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!goal.isGroup && (
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div>
              <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Auto-save</div>
              <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
                {ksh(fromMinor(goal.autoSaveAmountMinor))} · day {goal.autoSaveDay} of the month · {goal.autoSaveRail}
              </div>
            </div>
            <Toggle on={goal.autoSaveEnabled} onClick={savingAutoSave ? undefined : toggleAutoSave} />
          </div>
        )}
        {pledged > 0 && (
          <div
            onClick={() => navigate('/loan')}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Pledged against loan</div>
              <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{ksh(pledged)} locked · still earning</div>
            </div>
            <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>VIEW</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Activity
      </div>
      {goal.activity.length === 0 && (
        <div style={{ padding: '15px 0', fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>Nothing yet.</div>
      )}
      {goal.activity.map((entry) => {
        const amount = fromMinor(entry.amountMinor);
        const positive = amount >= 0;
        return (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)' }}>{entry.memo ?? KIND_LABEL[entry.kind]}</div>
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
    </div>
  );
}
