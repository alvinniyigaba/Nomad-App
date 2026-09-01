import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { rates } from '../data/mockData';
import { fmt, ksh, fromMinor, formatMonthYear } from '../utils/format';
import { paceStatus } from '../utils/pacing';
import { useAccounts } from '../hooks/useAccounts';

export default function SavingsScreen() {
  const navigate = useNavigate();
  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const goalBalance = fromMinor(goal?.balanceMinor ?? 0);
  const liquidBalance = fromMinor(liquid?.balanceMinor ?? 0);
  const totalBalance = goalBalance + liquidBalance;
  const pace = goal ? paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor }) : null;
  const pledged = fromMinor(goal?.pledgedMinor ?? 0);

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
        SAVINGS
      </div>
      <div style={{ marginTop: 18, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(totalBalance)}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge variant="outline">{savingsRateLabel}</Badge>
        <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>Interest paid monthly</span>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goal && (
          <div
            onClick={() => navigate('/save/goal')}
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 400, fontSize: 16, color: 'var(--text-heading)' }}>{goal.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(goalBalance)}</div>
            </div>
            <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
              of {ksh(fromMinor(goal.targetMinor))} · {formatMonthYear(goal.targetDate)}
            </div>
            <div style={{ marginTop: 14, height: 6, background: 'var(--bone-panel)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, pace?.pctFunded ?? 0) + '%', height: 6, background: 'var(--ink-green)' }} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>{pace?.pctFunded ?? 0}% funded</span>
              {pace?.behindMinor > 0 && (
                <span style={{ color: 'var(--accent-clay)' }}>{ksh(pace.behindMinor / 100)} behind pace</span>
              )}
              {pace?.aheadMinor > 0 && <span style={{ color: 'var(--success)' }}>{ksh(pace.aheadMinor / 100)} ahead of pace</span>}
            </div>
          </div>
        )}

        {liquid && (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 400, fontSize: 16, color: 'var(--text-heading)' }}>{liquid.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(liquidBalance)}</div>
            </div>
            <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>No target · fully liquid</div>
            <div style={{ marginTop: 14, height: 6, background: 'var(--bone-panel)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: 6, background: 'var(--savannah-sand)' }} />
            </div>
            <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>Available to withdraw today</div>
          </div>
        )}
      </div>

      {groupGoals.length > 0 && (
        <>
          <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Group goals
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groupGoals.map((g) => {
              const gBalance = fromMinor(g.balanceMinor);
              const gPace = paceStatus({ createdAt: g.createdAt, targetDate: g.targetDate, targetMinor: g.targetMinor, balanceMinor: g.balanceMinor });
              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/save/goal?account=${g.id}`)}
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 400, fontSize: 16, color: 'var(--text-heading)' }}>{g.name}</div>
                      <Badge variant="outline">{g.myRole === 'admin' ? 'Admin' : 'Member'}</Badge>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--text-heading)' }}>{fmt(gBalance)}</div>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
                    of {ksh(fromMinor(g.targetMinor))} · {formatMonthYear(g.targetDate)} · {g.members.length} members
                  </div>
                  <div style={{ marginTop: 14, height: 6, background: 'var(--bone-panel)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: Math.min(100, gPace?.pctFunded ?? 0) + '%', height: 6, background: 'var(--ink-green)' }} />
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>{gPace?.pctFunded ?? 0}% funded</div>
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
