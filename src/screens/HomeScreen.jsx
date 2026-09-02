import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import RouteDivider from '../components/ds/RouteDivider';
import TerrainPattern from '../components/ds/TerrainPattern';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { position, loan } from '../data/mockData';
import { fmt, ksh, fromMinor, formatMonthYear, capitalize, greeting } from '../utils/format';
import { paceStatus } from '../utils/pacing';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from '../hooks/useAccounts';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { useKyc } from '../hooks/useKyc';
import { totalInvestedMinor } from '../utils/investmentSeries';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const { holdings } = useExternalHoldings();
  const { kyc } = useKyc();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  // Total position is deliberately personal, not household: for a group
  // goal it counts only this user's own contribution, never the pooled
  // balance — that full/shared figure belongs on the Position summary
  // (tap-through) and the Savings screen's own group-goal cards, not here.
  // Invested is real (nomad-managed holdings' latest snapshot value). Owed
  // stays mock until loans are wired up.
  const myGroupContributions = groupGoals.reduce((sum, g) => {
    const mine = g.members.find((m) => m.username === user?.username)?.contributionMinor ?? '0';
    return sum + fromMinor(mine);
  }, 0);
  const saved = fromMinor(goal?.balanceMinor ?? 0) + fromMinor(liquid?.balanceMinor ?? 0) + myGroupContributions;
  const invested = fromMinor(totalInvestedMinor(holdings));
  const total = saved + invested - position.owed;
  const pace = goal ? paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor }) : null;

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NomadLogo brand="group" layout="horizontal" size={13} />
        <div
          onClick={() => navigate('/profile')}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            border: '1px solid var(--border-default)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--surface-card)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, letterSpacing: '0.04em', color: 'var(--ink-green)' }}>
            {user?.initial}
          </div>
          <div
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 5,
              background: 'var(--accent-clay)',
              border: '1.5px solid var(--surface-ground)',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 23, lineHeight: 1.35, color: 'var(--text-heading)' }}>
        {greeting()}, {capitalize(user?.username)}.
      </div>

      <div
        onClick={() => navigate('/position')}
        style={{ marginTop: 20, position: 'relative', overflow: 'hidden', background: 'var(--surface-ink)', border: '1px solid rgba(201,138,43,0.28)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-md)', cursor: 'pointer' }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="ink" width={360} height={200} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>
            Total position
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-on-ink)' }}>
            {ksh(total)}
          </div>
          <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12, color: 'var(--accent-gold)' }}>+{ksh(position.monthChange)} this month</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <div onClick={(e) => { e.stopPropagation(); navigate('/save'); }} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>Saved</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-on-ink)' }}>{fmt(saved)}</div>
            </div>
            <div onClick={(e) => { e.stopPropagation(); navigate('/loan'); }} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>Owed</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--accent-clay)' }}>{fmt(position.owed)}</div>
            </div>
            <div onClick={(e) => { e.stopPropagation(); navigate('/invest'); }} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>Invested</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-on-ink)' }}>{fmt(invested)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="primary" size="md" full style={{ flex: 1 }} onClick={() => navigate('/deposit?account=liquid')}>
          Add money
        </Button>
        <Button variant="outline" size="md" full style={{ flex: 1 }} onClick={() => navigate('/withdraw')}>
          Withdraw
        </Button>
      </div>

      <div style={{ margin: '22px 0 18px' }}>
        <RouteDivider variant="straight" width={358} />
      </div>

      <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Needs your attention
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          onClick={() => navigate('/loan')}
          style={{
            background: 'var(--surface-ink)',
            border: '1px solid rgba(201,138,43,0.28)',
            borderRadius: 8,
            padding: '18px 20px',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 11, height: 11, border: '1.4px solid var(--accent-gold)', borderRadius: 6 }} />
            <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>
              Due in 6 days
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--text-on-ink)' }}>Loan repayment</div>
              <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, color: 'var(--text-on-ink-body)' }}>
                Auto-debit from {loan.nextDue.rail} · {loan.nextDue.date}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 21, letterSpacing: '0.03em', color: 'var(--accent-gold)' }}>
              {fmt(loan.nextDue.amount)}
            </div>
          </div>
        </div>

        {goal && (
          <div
            onClick={() => navigate('/save/goal')}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '17px 20px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 11, height: 11, border: '1.4px solid var(--sand-line)', borderRadius: 6, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--text-heading)' }}>
                {goal.name} is {pace?.behindMinor > 0 ? 'behind pace' : 'on pace'}
              </div>
              <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
                {pace?.behindMinor > 0
                  ? `${ksh(pace.behindMinor / 100)} short of ${formatMonthYear(goal.targetDate)}`
                  : `${pace?.pctFunded ?? 0}% funded · target ${formatMonthYear(goal.targetDate)}`}
              </div>
            </div>
            <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>FUND</div>
          </div>
        )}

        <div
          onClick={() => navigate('/invest')}
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '17px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 11, height: 11, border: '1.4px solid var(--sand-line)', borderRadius: 6, flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--text-heading)' }}>Terrain Fund II · invitation</div>
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>Subscription window closes 30 September</div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>READ</div>
        </div>
      </div>

      {kyc && !kyc.complete && (
        <div
          onClick={() => navigate('/kyc')}
          style={{
            marginTop: 10,
            border: '1px solid var(--accent-gold)',
            borderRadius: 6,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-body)', flex: 1 }}>
            Verification is at step {kyc.step} of {kyc.totalSteps}. Finish it to raise your limits.
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>OPEN</div>
        </div>
      )}
    </div>
  );
}
