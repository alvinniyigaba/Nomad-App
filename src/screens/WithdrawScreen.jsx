import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { withdrawSource, withdrawDestinations, savings } from '../data/mockData';
import { fmt, ksh } from '../utils/format';
import { useAppState } from '../state/AppStateContext';

function chipStyle(active) {
  return {
    flex: 1,
    textAlign: 'center',
    padding: '12px 0',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 10,
    letterSpacing: '0.14em',
    border: '1px solid ' + (active ? 'var(--ink-green)' : 'var(--border-default)'),
    background: active ? 'var(--ink-green)' : 'transparent',
    color: active ? 'var(--bone)' : 'var(--text-muted)',
  };
}

export default function WithdrawScreen() {
  const navigate = useNavigate();
  const { wd, setWd, dest, setDest } = useAppState();
  const pledgedGoal = savings.goals[0];

  const destination = withdrawDestinations.find((d) => d.id === dest);
  const fee = destination.fee;
  const receive = Math.max(0, wd - fee);

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 19, color: 'var(--text-muted)', lineHeight: 1 }}>✕</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          WITHDRAW
        </div>
      </div>

      <div style={{ marginTop: 24, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        From
      </div>
      <div
        style={{
          marginTop: 10,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          padding: '17px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>{withdrawSource.accountName}</div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{ksh(withdrawSource.available)} available</div>
        </div>
        <div style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>⌄</div>
      </div>
      <div style={{ marginTop: 10, fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
        {pledgedGoal.name} is unavailable — {ksh(pledgedGoal.pledged)} is pledged against your loan.
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Amount
      </div>
      <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1.5px solid var(--ink-green)', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>KSh</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 30, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>{fmt(wd)}</span>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {withdrawSource.presets.map((amt) => (
          <div key={amt} onClick={() => setWd(amt)} style={chipStyle(wd === amt)}>
            {fmt(amt)}
          </div>
        ))}
        <div onClick={() => setWd(withdrawSource.available)} style={chipStyle(wd === withdrawSource.available)}>
          ALL
        </div>
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        To
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {withdrawDestinations.map((d) => (
          <div
            key={d.id}
            onClick={() => setDest(d.id)}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '17px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>{d.label}</div>
              <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{d.meta}</div>
            </div>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 11,
                flex: 'none',
                border: '1.5px solid var(--sand-line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 6, background: dest === d.id ? 'var(--ink-green)' : 'transparent' }} />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          background: 'var(--surface-panel)',
          borderRadius: 8,
          padding: '17px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>You receive</span>
        <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(receive)}</span>
      </div>
      <div style={{ marginTop: 20 }}>
        <Button variant="primary" size="lg" full onClick={() => navigate('/home')}>
          Withdraw {ksh(wd)}
        </Button>
      </div>
    </div>
  );
}
