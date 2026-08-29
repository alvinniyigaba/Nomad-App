import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { loan } from '../data/mockData';
import { fmt, ksh } from '../utils/format';

const DOT_COLOR = { paid: 'var(--ink-green)', due: 'var(--accent-gold)', future: 'var(--border-default)' };

export default function LoanScreen() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          YOUR LOAN
        </div>
        <div onClick={() => navigate('/borrow')} style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', cursor: 'pointer' }}>
          BORROW MORE
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Outstanding</div>
          <div style={{ marginTop: 9, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
            {ksh(loan.outstanding)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>of {ksh(loan.principal)}</div>
          <div style={{ marginTop: 6, fontWeight: 500, fontSize: 12, color: 'var(--ink-green)' }}>
            {loan.paidInstallments} of {loan.totalInstallments} paid
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, marginTop: 18 }}>
        {Array.from({ length: loan.totalInstallments }).map((_, i) => {
          const kind = i < loan.paidInstallments ? 'paid' : i === loan.paidInstallments ? 'due' : 'future';
          const color = kind === 'paid' ? 'var(--ink-green)' : kind === 'due' ? 'var(--accent-gold)' : 'var(--bone-panel)';
          return <div key={i} style={{ flex: 1, height: 8, background: color }} />;
        })}
      </div>

      <div
        style={{
          marginTop: 22,
          background: 'var(--surface-ink)',
          border: '1px solid rgba(201,138,43,0.28)',
          borderRadius: 8,
          padding: 20,
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>
            Due {loan.nextDue.date}
          </div>
          <div style={{ marginTop: 9, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 24, letterSpacing: '0.03em', color: 'var(--accent-gold)' }}>
            {ksh(loan.nextDue.amount)}
          </div>
          <div style={{ marginTop: 7, fontWeight: 300, fontSize: 12, color: 'var(--text-on-ink-body)' }}>Auto-debit from {loan.nextDue.rail}</div>
        </div>
        <Button variant="gold" size="sm">
          Pay now
        </Button>
      </div>

      <div style={{ marginTop: 26, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Schedule</div>
        <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', cursor: 'pointer' }}>SETTLE EARLY</div>
      </div>
      {loan.schedule.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: row.kind === 'paid' ? 'var(--ink-green)' : 'transparent',
                border: `1.4px solid ${DOT_COLOR[row.kind]}`,
              }}
            />
            <div style={{ fontWeight: row.kind === 'due' ? 500 : 300, fontSize: 13, color: row.kind === 'due' ? 'var(--text-heading)' : 'var(--text-muted)' }}>
              {row.label}
            </div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 13, color: row.kind === 'due' ? 'var(--text-heading)' : 'var(--text-muted)' }}>{fmt(row.amount)}</div>
        </div>
      ))}

      <div
        style={{
          marginTop: 20,
          background: 'var(--surface-panel)',
          borderRadius: 8,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-body)' }}>
          {ksh(loan.pledged)} pledged · unlocks {loan.pledgeUnlocks}
        </div>
        <div onClick={() => navigate('/save/goal')} style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', cursor: 'pointer' }}>
          DETAIL
        </div>
      </div>
    </div>
  );
}
