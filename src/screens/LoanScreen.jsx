import { useNavigate, useSearchParams } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { fromMinor, formatFullDate } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { useLoans } from '../hooks/useLoans';
import { LOAN_STATUS_BADGE as STATUS_BADGE } from '../utils/loans';
import { Amount, BackTitle, Eyebrow, ItemMeta, ItemTitle, ProgressBar, Screen } from '../components/ui';

function Detail({ label, value, wide }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <Eyebrow tracking="0.14em">{label}</Eyebrow>
      <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

/** One loan in full: what's still outstanding, its terms, and every repayment. Opened from the Borrow tab as /loan?id=<loan id>. */
export default function LoanScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, loans, error, refetch } = useLoans();
  const { fmt, ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const loan = loans.find((l) => l.id === searchParams.get('id'));
  const back = (
    <BackTitle onBack={() => navigate('/borrow')}>
      {loan ? loan.counterparty.toUpperCase() : 'LOAN'}
    </BackTitle>
  );
  if (!loan) {
    return (
      <Screen>
        {back}
        <div style={{ marginTop: 22, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>This loan isn&apos;t on your records.</div>
      </Screen>
    );
  }

  const lent = loan.direction === 'lent';
  const principal = fromMinor(loan.principalMinor);
  const repaid = fromMinor(loan.repaidMinor);
  const repaidPct = principal > 0 ? Math.min(100, Math.max(0, (repaid / principal) * 100)) : 0;
  const badge = STATUS_BADGE[loan.status];

  return (
    <Screen>
      {back}

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <Eyebrow>{lent ? `${loan.counterparty} still owes you` : `You still owe ${loan.counterparty}`}</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          <HideBalancesButton />
        </div>
      </div>
      <Amount top={9}>{ksh(fromMinor(loan.outstandingMinor))}</Amount>
      <div style={{ marginTop: 4, fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
        of {ksh(principal)} {lent ? 'lent' : 'borrowed'}
      </div>

      <ProgressBar top={16} pct={repaidPct} height={8} radius={0} />
      <div style={{ marginTop: 8, fontWeight: 500, fontSize: 12, color: 'var(--ink-green)' }}>{ksh(repaid)} repaid</div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 16, columnGap: 14 }}>
        <Detail label={lent ? 'Lent on' : 'Borrowed on'} value={loan.startDate ? formatFullDate(loan.startDate) : 'To confirm'} />
        <Detail label="Due" value={loan.dueDate ? formatFullDate(loan.dueDate) : 'To confirm'} />
        <Detail label="Terms" value={loan.terms || 'To confirm'} wide />
        {loan.notes && <Detail label="Notes" value={loan.notes} wide />}
      </div>

      <Eyebrow top={26}>Repayments</Eyebrow>
      {loan.repayments.length === 0 ? (
        <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>No repayments yet.</div>
      ) : (
        [...loan.repayments].reverse().map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <ItemTitle size={13}>{formatFullDate(r.paidOn)}</ItemTitle>
              {r.memo && <ItemMeta top={4}>{r.memo}</ItemMeta>}
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(r.amountMinor))}</div>
          </div>
        ))
      )}
    </Screen>
  );
}
