import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import RouteDivider from '../components/ds/RouteDivider';
import TerrainPattern from '../components/ds/TerrainPattern';
import Button from '../components/ds/Button';
import { customer, position, savings, loan } from '../data/mockData';
import { fmt, ksh } from '../utils/format';

export default function HomeScreen() {
  const navigate = useNavigate();
  const goalGap = savings.goals[0].target - savings.goals[0].balance <= 0 ? 0 : savings.goals[0].behindPace;

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NomadLogo brand="group" layout="horizontal" size={13} />
        <div
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            border: '1px solid var(--border-default)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 13, height: 11, border: '1.2px solid var(--ink-green)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, background: 'var(--accent-clay)' }} />
        </div>
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 23, lineHeight: 1.35, color: 'var(--text-heading)' }}>
        Good morning, {customer.name}.
      </div>
      <div style={{ marginTop: 7, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>Three things want your attention.</div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--text-heading)' }}>Shamba fund is behind pace</div>
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
              {ksh(goalGap)} short of {savings.goals[0].targetDate}
            </div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>FUND</div>
        </div>

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

      <div style={{ margin: '24px 0 20px' }}>
        <RouteDivider variant="straight" width={358} />
      </div>

      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface-panel)', borderRadius: 8, padding: 20 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="light" width={360} height={200} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Total position
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
            {ksh(position.total)}
          </div>
          <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12, color: 'var(--success)' }}>+{ksh(position.monthChange)} this month</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <div onClick={() => navigate('/save')} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Saved</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(position.saved)}</div>
            </div>
            <div onClick={() => navigate('/loan')} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Owed</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--accent-clay)' }}>{fmt(position.owed)}</div>
            </div>
            <div onClick={() => navigate('/invest')} style={{ flex: 1, cursor: 'pointer' }}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Invested</div>
              <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(position.invested)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button variant="primary" size="md" full style={{ flex: 1 }}>
          Add money
        </Button>
        <Button variant="outline" size="md" full style={{ flex: 1 }} onClick={() => navigate('/withdraw')}>
          Withdraw
        </Button>
      </div>

      <div
        onClick={() => navigate('/kyc')}
        style={{
          marginTop: 18,
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
          Verification is at step 3 of 4. Finish it to raise your limits.
        </div>
        <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>OPEN</div>
      </div>
    </div>
  );
}
