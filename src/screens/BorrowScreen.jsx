import { useNavigate } from 'react-router-dom';
import TerrainPattern from '../components/ds/TerrainPattern';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { fmt, ksh, fromMinor, formatFullDate } from '../utils/format';
import { useLoans } from '../hooks/useLoans';
import { LOAN_STATUS_BADGE as STATUS_BADGE } from '../utils/loans';


function SectionLabel({ children }) {
  return (
    <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}

function LoanCard({ loan, onOpen }) {
  const principal = fromMinor(loan.principalMinor);
  const repaid = fromMinor(loan.repaidMinor);
  const outstanding = fromMinor(loan.outstandingMinor);
  const repaidPct = principal > 0 ? Math.min(100, Math.max(0, (repaid / principal) * 100)) : 0;
  const lent = loan.direction === 'lent';
  const since = loan.startDate ? `${lent ? 'Lent' : 'Borrowed'} ${formatFullDate(loan.startDate)}` : `${lent ? 'Lent' : 'Borrowed'} · date to confirm`;

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '17px 20px',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 400, fontSize: 15, color: 'var(--text-heading)' }}>{loan.counterparty}</div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{since}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {STATUS_BADGE[loan.status] ? (
            <Badge variant={STATUS_BADGE[loan.status].variant}>{STATUS_BADGE[loan.status].label}</Badge>
          ) : (
            <div style={{ fontWeight: 500, fontSize: 14, color: lent ? 'var(--text-heading)' : 'var(--accent-clay)' }}>{fmt(outstanding)}</div>
          )}
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>of {fmt(principal)}</div>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 5, background: 'var(--sand-line)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: 5, background: 'var(--ink-green)', width: `${repaidPct}%` }} />
      </div>
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>{fmt(repaid)} repaid</div>
    </div>
  );
}

export default function BorrowScreen() {
  const navigate = useNavigate();
  const { status, loans, totals, error, refetch } = useLoans();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const lent = loans.filter((l) => l.direction === 'lent');
  const borrowed = loans.filter((l) => l.direction === 'borrowed');
  const open = (l) => navigate(`/loan?id=${l.id}`);

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
        BORROW &amp; LEND
      </div>

      <div style={{ marginTop: 20, position: 'relative', overflow: 'hidden', background: 'var(--surface-ink)', border: '1px solid rgba(201,138,43,0.28)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="ink" width={360} height={160} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>Owed to you</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--accent-gold)' }}>
            {ksh(fromMinor(totals.owedToYouMinor))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>You owe</div>
            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-on-ink)' }}>{ksh(fromMinor(totals.youOweMinor))}</div>
          </div>
        </div>
      </div>

      {loans.length === 0 ? (
        <div style={{ marginTop: 22, fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          No loans on record. Money you lend to or borrow from people outside Nomad shows here once it&apos;s added to your records.
        </div>
      ) : (
        <>
          {lent.length > 0 && (
            <>
              <SectionLabel>Money you lent</SectionLabel>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lent.map((l) => (
                  <LoanCard key={l.id} loan={l} onOpen={() => open(l)} />
                ))}
              </div>
            </>
          )}
          {borrowed.length > 0 && (
            <>
              <SectionLabel>Money you borrowed</SectionLabel>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {borrowed.map((l) => (
                  <LoanCard key={l.id} loan={l} onOpen={() => open(l)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
