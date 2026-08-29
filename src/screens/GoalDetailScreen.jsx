import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { savings, rates } from '../data/mockData';
import { fmt, ksh } from '../utils/format';
import { useAppState } from '../state/AppStateContext';

export default function GoalDetailScreen() {
  const navigate = useNavigate();
  const { autoSave, toggleAutoSave } = useAppState();
  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const goal = savings.goals[0];

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/save')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          SHAMBA FUND
        </div>
      </div>

      <div style={{ marginTop: 22, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(goal.balance)}
      </div>
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>
        of {ksh(goal.target)} · target {goal.targetDate}
      </div>
      <div style={{ marginTop: 18, height: 8, background: 'var(--bone-panel)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: goal.pctFunded + '%', height: 8, background: 'var(--ink-green)' }} />
      </div>
      <div style={{ marginTop: 9, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{goal.pctFunded}% funded</span>
        <span style={{ color: 'var(--accent-clay)' }}>{ksh(goal.behindPace)} behind pace</span>
      </div>

      <div style={{ marginTop: 22, display: 'flex', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ flex: 1, padding: '16px 0', borderRight: '1px solid var(--border-default)' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Interest earned</div>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(goal.interestEarned)}</div>
        </div>
        <div style={{ flex: 1, padding: '16px 0 16px 20px' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Rate</div>
          <div style={{ marginTop: 7, fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{savingsRateLabel}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              {ksh(goal.autoSave.amount)} · {goal.autoSave.day} · {goal.autoSave.rail}
            </div>
          </div>
          <div
            onClick={toggleAutoSave}
            style={{
              width: 46,
              height: 27,
              borderRadius: 14,
              position: 'relative',
              flex: 'none',
              cursor: 'pointer',
              background: autoSave ? 'var(--ink-green)' : 'var(--sand-line)',
            }}
          >
            <div style={{ position: 'absolute', top: 3, width: 21, height: 21, background: 'var(--bone)', borderRadius: 11, left: autoSave ? 22 : 3 }} />
          </div>
        </div>
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
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{ksh(goal.pledged)} locked · still earning</div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>VIEW</div>
        </div>
      </div>

      <div style={{ marginTop: 24, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Activity
      </div>
      {goal.activity.map((row) => (
        <div key={row.label + row.meta} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)' }}>{row.label}</div>
            <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>{row.meta}</div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--success)' }}>+{fmt(row.amount)}</div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <Button variant="primary" size="md" full style={{ flex: 1 }}>
          Top up
        </Button>
        <Button variant="outline" size="md" full style={{ flex: 1 }}>
          Edit goal
        </Button>
      </div>
    </div>
  );
}
