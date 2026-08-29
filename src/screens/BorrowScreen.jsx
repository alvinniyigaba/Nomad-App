import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { borrow, rates } from '../data/mockData';
import { ksh } from '../utils/format';
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

export default function BorrowScreen() {
  const navigate = useNavigate();
  const { loanAmount, setLoanAmount } = useAppState();

  const savingsRateLabel = rates.savings.toFixed(1) + '% p.a.';
  const loanRateLabel = rates.loan.toFixed(1) + '% p.a.';
  const interest = (loanAmount * rates.loan) / 100;
  const fee = loanAmount * borrow.arrangementFeePct;
  const monthly = (loanAmount + interest + fee) / borrow.termMonths;
  const loanPct = Math.round((loanAmount / borrow.availableLimit) * 100) + '%';
  const pledgeAmount = loanAmount / borrow.ltv;

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
        BORROW
      </div>
      <div style={{ marginTop: 20, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Available to you
      </div>
      <div style={{ marginTop: 9, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(borrow.availableLimit)}
      </div>
      <div style={{ marginTop: 10, fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body)' }}>
        Eighty per cent of the {ksh(borrow.unpledgedSavings)} not already pledged. What you pledge locks, and keeps earning {savingsRateLabel} while it does.
      </div>

      <div style={{ marginTop: 22, background: 'var(--surface-panel)', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>You want</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
            {ksh(loanAmount)}
          </div>
        </div>
        <div style={{ marginTop: 16, height: 5, background: 'var(--sand-line)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: 5, background: 'var(--ink-green)', width: loanPct }} />
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
          {borrow.presets.map((amt) => (
            <div key={amt} onClick={() => setLoanAmount(amt)} style={chipStyle(loanAmount === amt)}>
              {amt / 1000}K
            </div>
          ))}
          <div onClick={() => setLoanAmount(borrow.availableLimit)} style={chipStyle(loanAmount === borrow.availableLimit)}>
            {borrow.availableLimit / 1000}K
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        What it costs
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>Interest · {loanRateLabel}</span>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{ksh(interest)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>Arrangement fee · 1%</span>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{ksh(fee)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>Term</span>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{borrow.termMonths} months</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0' }}>
        <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Monthly repayment</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 19, color: 'var(--text-heading)' }}>{ksh(monthly)}</span>
      </div>

      <div style={{ border: '1px solid var(--accent-gold)', borderRadius: 6, padding: '16px 18px', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <div style={{ width: 11, height: 11, border: '1.4px solid var(--accent-gold)', borderRadius: 6, flex: 'none', marginTop: 4 }} />
        <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-body)' }}>
          {ksh(pledgeAmount)} of savings locks until the loan closes. You keep the interest; you cannot withdraw the balance.
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Button variant="primary" size="lg" full onClick={() => navigate('/loan')}>
          Pledge and continue
        </Button>
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>
        Approval is instant. No paperwork.
      </div>
    </div>
  );
}
