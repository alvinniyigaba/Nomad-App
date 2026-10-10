import { useNavigate, useSearchParams } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { fmt, ksh, fromMinor, formatFullDate } from '../utils/format';
import { useLoans } from '../hooks/useLoans';
import { LOAN_STATUS_BADGE as STATUS_BADGE } from '../utils/loans';

function Detail({ label, value, wide }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

/** One loan in full: what's still outstanding, its terms, and every repayment. Opened from the Borrow tab as /loan?id=<loan id>. */
export default function LoanScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, loans, error, refetch } = useLoans();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const loan = loans.find((l) => l.id === searchParams.get('id'));
  const back = (
    <div onClick={() => navigate('/borrow')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
        {loan ? loan.counterparty.toUpperCase() : 'LOAN'}
      </div>
    </div>
  );
  if (!loan) {
    return (
      <div style={{ padding: '0 22px 28px' }}>
        {back}
        <div style={{ marginTop: 22, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>This loan isn&apos;t on your records.</div>
      </div>
    );
  }

  const lent = loan.direction === 'lent';
  const principal = fromMinor(loan.principalMinor);
  const repaid = fromMinor(loan.repaidMinor);
  const repaidPct = principal > 0 ? Math.min(100, Math.max(0, (repaid / principal) * 100)) : 0;
  const badge = STATUS_BADGE[loan.status];

  return (
    <div style={{ padding: '0 22px 28px' }}>
      {back}

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {lent ? `${loan.counterparty} still owes you` : `You still owe ${loan.counterparty}`}
        </div>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <div style={{ marginTop: 9, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(fromMinor(loan.outstandingMinor))}
      </div>
      <div style={{ marginTop: 4, fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
        of {ksh(principal)} {lent ? 'lent' : 'borrowed'}
      </div>

      <div style={{ marginTop: 16, height: 8, background: 'var(--bone-panel)' }}>
        <div style={{ height: 8, background: 'var(--ink-green)', width: `${repaidPct}%` }} />
      </div>
      <div style={{ marginTop: 8, fontWeight: 500, fontSize: 12, color: 'var(--ink-green)' }}>{ksh(repaid)} repaid</div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 16, columnGap: 14 }}>
        <Detail label={lent ? 'Lent on' : 'Borrowed on'} value={loan.startDate ? formatFullDate(loan.startDate) : 'To confirm'} />
        <Detail label="Due" value={loan.dueDate ? formatFullDate(loan.dueDate) : 'To confirm'} />
        <Detail label="Terms" value={loan.terms || 'To confirm'} wide />
        {loan.notes && <Detail label="Notes" value={loan.notes} wide />}
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Repayments
      </div>
      {loan.repayments.length === 0 ? (
        <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>No repayments yet.</div>
      ) : (
        [...loan.repayments].reverse().map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)' }}>{formatFullDate(r.paidOn)}</div>
              {r.memo && <div style={{ marginTop: 4, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{r.memo}</div>}
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(r.amountMinor))}</div>
          </div>
        ))
      )}
    </div>
  );
}
