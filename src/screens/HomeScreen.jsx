import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import RouteDivider from '../components/ds/RouteDivider';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { position } from '../data/mockData';
import { fromMinor, formatMonthYear, capitalize, greeting } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { paceStatus } from '../utils/pacing';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from '../hooks/useAccounts';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { useKyc } from '../hooks/useKyc';
import { useLoans, netLoansMinor } from '../hooks/useLoans';
import { loanPrompts } from '../utils/loans';
import { positionInvestedMinor } from '../utils/investmentSeries';
import { ActionLabel, Amount, Card, Eyebrow, InkCard, ItemMeta, ItemTitle, Screen, Stack } from '../components/ui';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const { holdings } = useExternalHoldings();
  const { kyc } = useKyc();
  const { totals: loanTotals, loans: loanList } = useLoans();
  const { fmt, ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  // Total position is deliberately personal, not household: for a group
  // goal it counts only this user's own contribution, never the pooled
  // balance — that full/shared figure belongs on the Position summary
  // (tap-through) and the Savings screen's own group-goal cards, not here.
  // Invested is real (nomad-managed holdings' latest snapshot value, plus
  // external holdings on record). Loans is what others still owe this user
  // minus what they owe, from private loans on record (Borrow tab).
  const myGroupContributions = groupGoals.reduce((sum, g) => {
    const mine = g.members.find((m) => m.username === user?.username)?.contributionMinor ?? '0';
    return sum + fromMinor(mine);
  }, 0);
  const saved = fromMinor(goal?.balanceMinor ?? 0) + fromMinor(liquid?.balanceMinor ?? 0) + myGroupContributions;
  const invested = fromMinor(positionInvestedMinor(holdings));
  const loans = fromMinor(netLoansMinor(loanTotals));
  const total = saved + invested + loans;
  const pace = goal ? paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor }) : null;

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NomadLogo brand="group" layout="horizontal" size={13} />
        <div
          onClick={() => navigate('/profile')}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            border: '1px solid var(--border-default)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--surface-card)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, letterSpacing: '0.04em', color: 'var(--ink-green)' }}>
            {user?.initial}
          </div>
          <div
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 5,
              background: 'var(--accent-clay)',
              border: '1.5px solid var(--surface-ground)',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 23, lineHeight: 1.35, color: 'var(--text-heading)' }}>
        {greeting()}, {capitalize(user?.username)}.
      </div>

      <InkCard onClick={() => navigate('/position')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Eyebrow tone="ink">Total position</Eyebrow>
          <HideBalancesButton tone="ink" />
        </div>
        <Amount top={8} color="var(--text-on-ink)">{ksh(total)}</Amount>
        <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12, color: 'var(--accent-gold)' }}>+{ksh(position.monthChange)} this month</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <div onClick={(e) => { e.stopPropagation(); navigate('/save'); }} style={{ flex: 1, cursor: 'pointer' }}>
            <Eyebrow tone="ink" tracking="0.18em">Saved</Eyebrow>
            <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-on-ink)' }}>{fmt(saved)}</div>
          </div>
          <div onClick={(e) => { e.stopPropagation(); navigate('/invest'); }} style={{ flex: 1, cursor: 'pointer' }}>
            <Eyebrow tone="ink" tracking="0.18em">Invested</Eyebrow>
            <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-on-ink)' }}>{fmt(invested)}</div>
          </div>
          <div onClick={(e) => { e.stopPropagation(); navigate('/borrow'); }} style={{ flex: 1, cursor: 'pointer' }}>
            <Eyebrow tone="ink" tracking="0.18em">Loans</Eyebrow>
            <div style={{ marginTop: 5, fontWeight: 500, fontSize: 13, color: loans < 0 ? 'var(--accent-clay)' : 'var(--text-on-ink)' }}>{fmt(loans)}</div>
          </div>
        </div>
      </InkCard>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="primary" size="md" full style={{ flex: 1 }} onClick={() => navigate('/deposit?account=liquid')}>
          Add money
        </Button>
        <Button variant="outline" size="md" full style={{ flex: 1 }} onClick={() => navigate('/withdraw')}>
          Withdraw
        </Button>
      </div>

      <div style={{ margin: '22px 0 18px' }}>
        <RouteDivider variant="straight" width={358} />
      </div>

      <Eyebrow>Needs your attention</Eyebrow>

      <Stack top={14}>
        {loanPrompts(loanList).map((p) => (
          <Card key={p.key} padding="17px 20px" onClick={() => navigate(`/loan?id=${p.loanId}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, borderColor: 'var(--accent-gold)' }}>
            <div style={{ width: 11, height: 11, border: '1.4px solid var(--accent-gold)', borderRadius: 6, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <ItemTitle size={15}>{p.title}</ItemTitle>
              <ItemMeta>{p.amountMinor ? `${ksh(fromMinor(p.amountMinor))} · ` : ''}{p.detail}</ItemMeta>
            </div>
            <ActionLabel>OPEN</ActionLabel>
          </Card>
        ))}
        {goal && (
          <Card padding="17px 20px" onClick={() => navigate('/save/goal')} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 11, height: 11, border: '1.4px solid var(--sand-line)', borderRadius: 6, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <ItemTitle size={15}>{goal.name} is {pace?.behindMinor > 0 ? 'behind pace' : 'on pace'}</ItemTitle>
              <ItemMeta>
                {pace?.behindMinor > 0
                  ? `${ksh(pace.behindMinor / 100)} short of ${formatMonthYear(goal.targetDate)}`
                  : `${pace?.pctFunded ?? 0}% funded · target ${formatMonthYear(goal.targetDate)}`}
              </ItemMeta>
            </div>
            <ActionLabel>FUND</ActionLabel>
          </Card>
        )}

        <Card padding="17px 20px" onClick={() => navigate('/invest')} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 11, height: 11, border: '1.4px solid var(--sand-line)', borderRadius: 6, flex: 'none' }} />
          <div style={{ flex: 1 }}>
            <ItemTitle size={15}>Terrain Fund II · invitation</ItemTitle>
            <ItemMeta>Subscription window closes 30 September</ItemMeta>
          </div>
          <ActionLabel>READ</ActionLabel>
        </Card>
      </Stack>

      {kyc && !kyc.complete && (
        <div
          onClick={() => navigate('/kyc')}
          style={{
            marginTop: 10,
            border: '1px solid var(--accent-gold)',
            borderRadius: 6,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-body)', flex: 1 }}>
            Verification is at step {kyc.step} of {kyc.totalSteps}. Finish it to raise your limits.
          </div>
          <ActionLabel>OPEN</ActionLabel>
        </div>
      )}
    </Screen>
  );
}
