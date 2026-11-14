import { useNavigate } from 'react-router-dom';
import HideBalancesButton from '../../components/HideBalancesButton';
import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, InkHeader, ItemMeta, PillButton, RouteBar, SoftCard, Stack, Tag } from '../../components/ui';
import { HOME_CURRENCY } from '../../config/journeyRules';
import { rates } from '../../data/mockData';
import { useMoney } from '../../hooks/useMoney';
import { formatMonthYear, fromMinor } from '../../utils/format';
import { paceStatus } from '../../utils/pacing';
import { useJourneyScreen } from './useJourneyScreen';

const RATE_LABEL = rates.savings.toFixed(1) + '% p.a.';

function months(n) {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded} ${rounded === 1 ? 'month' : 'months'}`;
}

/** Name and balance on one line, as every savings card opens. */
function CardTop({ name, amount, tag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>{name}</span>
        {tag}
      </div>
      <span style={{ flex: 'none', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--text-heading)' }}>{amount}</span>
    </div>
  );
}

/** A goal's card: target, the route to it with the member's waypoint, and how they stand against pace. */
function GoalCard({ goal, money, onClick, tag, extraMeta }) {
  const pace = paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor });
  const pct = pace?.pctFunded ?? 0;
  return (
    <SoftCard onClick={onClick}>
      <CardTop name={goal.name} amount={money.fmt(fromMinor(goal.balanceMinor))} tag={tag} />
      <ItemMeta top={4}>
        of {money.ksh(fromMinor(goal.targetMinor))} · {formatMonthYear(goal.targetDate)}
        {extraMeta}
      </ItemMeta>
      <div style={{ marginTop: 14 }}>
        <RouteBar value={pct / 100} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 300, fontSize: 11 }}>
        <span style={{ color: 'var(--text-body)' }}>{pct}% of the way</span>
        {pace?.behindMinor > 0 && <span style={{ fontWeight: 500, color: 'var(--accent-clay)' }}>{money.ksh(pace.behindMinor / 100)} behind pace</span>}
        {pace?.aheadMinor > 0 && <span style={{ fontWeight: 500, color: 'var(--success)' }}>{money.ksh(pace.aheadMinor / 100)} ahead of pace</span>}
      </div>
    </SoftCard>
  );
}

/**
 * Save for members in the journey preview. The ink header carries what the
 * member has saved, the rate and the two money actions; below it sit the
 * personal goal, the liquid fund (with how many months of costs it would
 * cover, once costs are on record), group goals and any pledge.
 */
export default function JourneySaveScreen() {
  const navigate = useNavigate();
  const { status, error, refetch, model, accounts } = useJourneyScreen();
  const money = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const { stage, runway, hasCosts } = model;
  const goal = accounts.find((a) => a.kind === 'goal' && !a.isGroup) ?? null;
  const liquid = accounts.find((a) => a.kind === 'liquid' && !a.isGroup) ?? null;
  const groupGoals = accounts.filter((a) => a.isGroup);
  // Balances arrive as strings (bigint minor units), so convert before adding.
  const savedMinor = Number(goal?.balanceMinor ?? 0) + Number(liquid?.balanceMinor ?? 0);
  const pledged = fromMinor(goal?.pledgedMinor ?? 0);

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkHeader stageId={stage.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '0.12em' }}>SAVINGS</div>
          <HideBalancesButton tone="ink" />
        </div>
        <div style={{ marginTop: 6, fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: 'var(--taupe-on-ink)' }}>SAVED · {HOME_CURRENCY}</div>
        <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 34, letterSpacing: '0.02em', lineHeight: 1.05 }}>{money.fmt(fromMinor(savedMinor))}</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Tag background="rgba(245,238,226,0.14)" color="var(--text-on-ink)">{RATE_LABEL}</Tag>
          <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-on-ink-body)' }}>Interest paid monthly</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <PillButton variant="gold" icon="add" style={{ flex: 1.4 }} onClick={() => navigate('/deposit?account=liquid')}>Add money</PillButton>
          <PillButton variant="outlineOnInk" icon="withdraw" style={{ flex: 1 }} onClick={() => navigate('/withdraw')}>Withdraw</PillButton>
        </div>
      </InkHeader>

      <div style={{ padding: '18px 22px 0' }}>
        <Stack gap={14}>
          {goal && <GoalCard goal={goal} money={money} onClick={() => navigate('/save/goal')} />}

          {liquid && (
            <SoftCard>
              <CardTop name={liquid.name} amount={money.fmt(fromMinor(liquid.balanceMinor))} tag={<Tag>LIQUID</Tag>} />
              <ItemMeta top={4}>No target · available to withdraw today</ItemMeta>
              <div style={{ marginTop: 12, background: 'var(--surface-panel)', borderRadius: 14, padding: '10px 12px', fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-body)' }}>
                {hasCosts && runway != null ? (
                  <>
                    Covers <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{money.hidden ? '—' : months(runway)}</span> of your day-to-day costs.
                  </>
                ) : (
                  'Once your monthly costs are on record, this shows how many months this fund would carry you.'
                )}
              </div>
            </SoftCard>
          )}
        </Stack>

        {groupGoals.length > 0 && (
          <>
            <Eyebrow top={24}>Group goals</Eyebrow>
            <Stack gap={14}>
              {groupGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  money={money}
                  onClick={() => navigate(`/save/goal?account=${g.id}`)}
                  tag={<Tag>{g.myRole === 'admin' ? 'ADMIN' : 'MEMBER'}</Tag>}
                  extraMeta={` · ${g.members.length} ${g.members.length === 1 ? 'member' : 'members'}`}
                />
              ))}
            </Stack>
          </>
        )}

        {pledged > 0 && (
          <div style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 11, height: 11, border: '2px solid var(--ochre-gold)', borderRadius: 7, flex: 'none' }} />
            <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.55, color: 'var(--text-body)' }}>
              {money.ksh(pledged)} is pledged against your loan. It stays locked and keeps earning {RATE_LABEL}
            </div>
          </div>
        )}

        {!goal && !liquid && groupGoals.length === 0 && (
          <div style={{ fontWeight: 300, fontSize: 13, lineHeight: 1.55, color: 'var(--text-body)', textAlign: 'center', padding: '6px 12px 0' }}>
            Nothing saved yet. Add money to your liquid fund, or open a goal to save toward something.
          </div>
        )}

        <PillButton icon="goals" style={{ marginTop: 20, width: '100%' }} onClick={() => navigate('/save/new')}>
          Open a new goal
        </PillButton>
      </div>
    </div>
  );
}
