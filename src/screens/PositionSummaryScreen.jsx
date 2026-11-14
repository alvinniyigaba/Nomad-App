import { useNavigate } from 'react-router-dom';
import { Loading, ErrorState } from '../components/ScreenState';
import { position } from '../data/mockData';
import { fromMinor } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from '../hooks/useAccounts';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { positionInvestedMinor } from '../utils/investmentSeries';
import { useLoans, netLoansMinor } from '../hooks/useLoans';
import { Amount, BackTitle, Eyebrow, InkCard, Screen } from '../components/ui';

function Row({ label, value, muted, indent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border-default)', paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontWeight: 300, fontSize: 13, color: muted ? 'var(--text-faint)' : 'var(--text-body)' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, color: muted ? 'var(--text-faint)' : 'var(--text-heading)' }}>{value}</span>
    </div>
  );
}

export default function PositionSummaryScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const { holdings: externalHoldings } = useExternalHoldings();
  const { loans, totals: loanTotals } = useLoans();
  const { fmt, ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const individualSaved = fromMinor(goal?.balanceMinor ?? 0) + fromMinor(liquid?.balanceMinor ?? 0);
  const groupTotal = groupGoals.reduce((sum, g) => sum + fromMinor(g.balanceMinor), 0);
  const nomadHoldings = externalHoldings.filter((h) => h.managedBy === 'nomad' && h.status === 'active');
  const onRecordHoldings = externalHoldings.filter((h) => h.managedBy === 'external' && h.status === 'active');
  const invested = fromMinor(positionInvestedMinor(externalHoldings));
  // Same fields Home's collapsed card sums, plus group goals — keeps the two screens' totals from ever silently diverging.
  const total = individualSaved + groupTotal + invested + fromMinor(netLoansMinor(loanTotals));
  const openLoans = loans.filter((l) => (l.status === 'active' || l.status === 'overdue') && Number(l.outstandingMinor) > 0);

  return (
    <Screen>
      <BackTitle onBack={() => navigate('/home')}>
        YOUR POSITION
      </BackTitle>

      <InkCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Eyebrow tone="ink">Total position</Eyebrow>
          <HideBalancesButton tone="ink" />
        </div>
        <Amount top={8} color="var(--text-on-ink)">{ksh(total)}</Amount>
        <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12, color: 'var(--accent-gold)' }}>+{ksh(position.monthChange)} this month</div>
      </InkCard>

      <Eyebrow top={26} bottom={4}>Savings</Eyebrow>
      {goal && (
        <div onClick={() => navigate('/save/goal')} style={{ cursor: 'pointer' }}>
          <Row label={goal.name} value={fmt(fromMinor(goal.balanceMinor))} />
        </div>
      )}
      {liquid && <Row label={liquid.name} value={fmt(fromMinor(liquid.balanceMinor))} />}

      {groupGoals.length > 0 && (
        <>
          <Eyebrow top={26} bottom={4}>Group goals</Eyebrow>
          {groupGoals.map((g) => {
            const myContribution = g.members.find((m) => m.username === user?.username)?.contributionMinor ?? '0';
            return (
              <div key={g.id}>
                <div onClick={() => navigate(`/save/goal?account=${g.id}`)} style={{ cursor: 'pointer' }}>
                  <Row label={g.name} value={fmt(fromMinor(g.balanceMinor))} />
                </div>
                <Row label={`Your contribution`} value={fmt(fromMinor(myContribution))} muted indent />
              </div>
            );
          })}
        </>
      )}

      <Eyebrow top={26} bottom={4}>Investments</Eyebrow>
      {nomadHoldings.length > 0 || onRecordHoldings.length > 0 ? (
        <>
          {nomadHoldings.map((h) => {
            const latest = h.history?.length ? fromMinor(Number(h.history[h.history.length - 1].valueMinor)) : null;
            return (
              <div key={h.id} onClick={() => navigate('/invest')} style={{ cursor: 'pointer' }}>
                <Row label={h.providerName} value={latest != null ? fmt(latest) : '—'} />
              </div>
            );
          })}
          {/* Counted in the total once they carry a balance — a holding with none yet shows "—" and adds nothing. */}
          {onRecordHoldings.map((h) => (
            <div key={h.id} onClick={() => navigate('/invest')} style={{ cursor: 'pointer' }}>
              <Row label={`${h.providerName} · not managed by Nomad`} value={h.balanceMinor != null ? fmt(fromMinor(h.balanceMinor)) : '—'} />
            </div>
          ))}
        </>
      ) : (
        <div onClick={() => navigate('/invest')} style={{ cursor: 'pointer' }}>
          <Row label="Invested" value={fmt(0)} muted />
        </div>
      )}

      <Eyebrow top={26} bottom={4}>Loans</Eyebrow>
      {openLoans.length > 0 ? (
        openLoans.map((l) => (
          <div key={l.id} onClick={() => navigate(`/loan?id=${l.id}`)} style={{ cursor: 'pointer' }}>
            <Row
              label={l.direction === 'lent' ? `Owed by ${l.counterparty}` : `You owe ${l.counterparty}`}
              value={l.direction === 'lent' ? fmt(fromMinor(l.outstandingMinor)) : `−${fmt(fromMinor(l.outstandingMinor))}`}
            />
          </div>
        ))
      ) : (
        <div onClick={() => navigate('/borrow')} style={{ cursor: 'pointer' }}>
          <Row label="Loans" value={fmt(0)} muted />
        </div>
      )}
    </Screen>
  );
}
