import { useNavigate } from 'react-router-dom';
import HideBalancesButton from '../../components/HideBalancesButton';
import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, InkHeader, ItemMeta, RouteBar, SoftCard, Stack, Tag } from '../../components/ui';
import { HOME_CURRENCY } from '../../config/journeyRules';
import { useMoney } from '../../hooks/useMoney';
import { formatFullDate, fromMinor } from '../../utils/format';
import { LOAN_STATUS_BADGE } from '../../utils/loans';
import { useJourneyScreen } from './useJourneyScreen';

// Tag colours for loans that aren't simply open; labels come from LOAN_STATUS_BADGE.
const STATUS_TAG = {
  overdue: { background: 'var(--ochre-gold)', color: 'var(--earth-900)' },
  repaid: { background: 'var(--ink-green)', color: 'var(--text-on-ink)' },
  written_off: { background: 'var(--surface-panel)', color: 'var(--text-body)' },
};

/** One loan: who, since when, what is still out, and how much has come back, drawn as the route. */
function LoanCard({ loan, money, onOpen }) {
  const principalMinor = Number(loan.principalMinor);
  const repaidMinor = Number(loan.repaidMinor);
  const repaidShare = principalMinor > 0 ? repaidMinor / principalMinor : 0;
  const lent = loan.direction === 'lent';
  const since = loan.startDate ? `${lent ? 'Lent' : 'Borrowed'} ${formatFullDate(loan.startDate)}` : `${lent ? 'Lent' : 'Borrowed'} · date to confirm`;
  const badge = LOAN_STATUS_BADGE[loan.status];

  return (
    <SoftCard onClick={onOpen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>{loan.counterparty}</div>
          <ItemMeta top={4}>{since}</ItemMeta>
        </div>
        <div style={{ flex: 'none', textAlign: 'right' }}>
          {badge ? (
            <Tag {...STATUS_TAG[loan.status]}>{badge.label.toUpperCase()}</Tag>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: lent ? 'var(--text-heading)' : 'var(--accent-clay)' }}>{money.fmt(fromMinor(loan.outstandingMinor))}</div>
          )}
          <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>of {money.fmt(fromMinor(loan.principalMinor))}</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <RouteBar value={repaidShare} />
      </div>
      <div style={{ marginTop: 8, fontWeight: 300, fontSize: 11, color: 'var(--text-body)' }}>
        {money.fmt(fromMinor(loan.repaidMinor))} repaid{lent ? ' to you' : ''}
      </div>
    </SoftCard>
  );
}

function Section({ title, loans, money, open }) {
  if (loans.length === 0) return null;
  return (
    <>
      <Eyebrow top={24}>{title}</Eyebrow>
      <Stack gap={14}>
        {loans.map((l) => (
          <LoanCard key={l.id} loan={l} money={money} onOpen={() => open(l)} />
        ))}
      </Stack>
    </>
  );
}

/**
 * Borrow & lend for members in the journey preview. The ink header gives
 * the net position (owed to you less what you owe) with both sides beneath
 * it; below sit the loans the member made and the loans they took, each
 * showing repayment as the route.
 */
export default function JourneyBorrowScreen() {
  const navigate = useNavigate();
  const { status, error, refetch, model, loans, loanTotals: totals } = useJourneyScreen();
  const money = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const owedMinor = Number(totals.owedToYouMinor);
  const oweMinor = Number(totals.youOweMinor);
  const netMinor = owedMinor - oweMinor;
  const open = (l) => navigate(`/loan?id=${l.id}`);

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkHeader stageId={model.stage.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '0.12em' }}>BORROW &amp; LEND</div>
          <HideBalancesButton tone="ink" />
        </div>
        <div style={{ marginTop: 6, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: 'var(--taupe-on-ink)' }}>NET · {HOME_CURRENCY}</div>
        <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 34, letterSpacing: '0.02em', lineHeight: 1.05 }}>
          {netMinor < 0 && !money.hidden ? '−' : ''}
          {money.fmt(fromMinor(Math.abs(netMinor)))}
        </div>
        <div style={{ marginTop: 4, fontWeight: 300, fontSize: 12, color: 'var(--text-on-ink-body)' }}>
          {netMinor > 0 ? 'More is owed to you than you owe.' : netMinor < 0 ? 'You owe more than is owed to you.' : owedMinor > 0 ? 'What you are owed and what you owe balance out.' : 'Nothing lent or borrowed right now.'}
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Owed to you', owedMinor, 'var(--ochre-gold)'],
            ['You owe', oweMinor, 'var(--text-on-ink)'],
          ].map(([label, valueMinor, color]) => (
            <div key={label} style={{ background: 'rgba(245,238,226,0.1)', borderRadius: 18, padding: '12px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>{label}</div>
              <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color }}>{money.fmt(fromMinor(valueMinor))}</div>
            </div>
          ))}
        </div>
      </InkHeader>

      <div style={{ padding: '4px 22px 0' }}>
        {loans.length === 0 ? (
          <SoftCard style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body)' }}>
              No loans on record. Money you lend to or borrow from people outside Nomad shows here once Nomad adds it to your records.
            </div>
          </SoftCard>
        ) : (
          <>
            <Section title="Money you lent" loans={loans.filter((l) => l.direction === 'lent')} money={money} open={open} />
            <Section title="Money you borrowed" loans={loans.filter((l) => l.direction === 'borrowed')} money={money} open={open} />
          </>
        )}
      </div>
    </div>
  );
}
