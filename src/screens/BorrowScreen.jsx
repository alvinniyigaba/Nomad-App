import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import { Loading, ErrorState } from '../components/ScreenState';
import { fromMinor, formatFullDate } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { useLoans } from '../hooks/useLoans';
import { LOAN_STATUS_BADGE as STATUS_BADGE } from '../utils/loans';
import { Amount, Card, Eyebrow, InkCard, ItemMeta, ItemTitle, ProgressBar, Screen, ScreenTitle, Stack } from '../components/ui';

function LoanCard({ loan, onOpen }) {
  const { fmt } = useMoney();
  const principal = fromMinor(loan.principalMinor);
  const repaid = fromMinor(loan.repaidMinor);
  const outstanding = fromMinor(loan.outstandingMinor);
  const repaidPct = principal > 0 ? Math.min(100, Math.max(0, (repaid / principal) * 100)) : 0;
  const lent = loan.direction === 'lent';
  const since = loan.startDate ? `${lent ? 'Lent' : 'Borrowed'} ${formatFullDate(loan.startDate)}` : `${lent ? 'Lent' : 'Borrowed'} · date to confirm`;

  return (
    <Card padding="17px 20px" onClick={onOpen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          <ItemTitle size={15}>{loan.counterparty}</ItemTitle>
          <ItemMeta>{since}</ItemMeta>
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
      <ProgressBar top={14} pct={repaidPct} height={5} radius={3} track="var(--sand-line)" />
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>{fmt(repaid)} repaid</div>
    </Card>
  );
}

export default function BorrowScreen() {
  const navigate = useNavigate();
  const { status, loans, totals, error, refetch } = useLoans();
  const { ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const lent = loans.filter((l) => l.direction === 'lent');
  const borrowed = loans.filter((l) => l.direction === 'borrowed');
  const open = (l) => navigate(`/loan?id=${l.id}`);

  return (
    <Screen>
      <ScreenTitle>BORROW &amp; LEND</ScreenTitle>

      <InkCard terrainHeight={160}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Eyebrow tone="ink">Owed to you</Eyebrow>
          <HideBalancesButton tone="ink" />
        </div>
        <Amount top={8} color="var(--accent-gold)">{ksh(fromMinor(totals.owedToYouMinor))}</Amount>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Eyebrow tone="ink">You owe</Eyebrow>
          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-on-ink)' }}>{ksh(fromMinor(totals.youOweMinor))}</div>
        </div>
      </InkCard>

      {loans.length === 0 ? (
        <div style={{ marginTop: 22, fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          No loans on record. Money you lend to or borrow from people outside Nomad shows here once it&apos;s added to your records.
        </div>
      ) : (
        <>
          {lent.length > 0 && (
            <>
              <Eyebrow top={26}>Money you lent</Eyebrow>
              <Stack>
                {lent.map((l) => (
                  <LoanCard key={l.id} loan={l} onOpen={() => open(l)} />
                ))}
              </Stack>
            </>
          )}
          {borrowed.length > 0 && (
            <>
              <Eyebrow top={26}>Money you borrowed</Eyebrow>
              <Stack>
                {borrowed.map((l) => (
                  <LoanCard key={l.id} loan={l} onOpen={() => open(l)} />
                ))}
              </Stack>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
