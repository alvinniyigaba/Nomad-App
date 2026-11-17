import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HideBalancesButton from '../../components/HideBalancesButton';
import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, InkHeader, ItemMeta, ItemTitle, PillButton, RouteBar, Segmented, Shortcut, SoftCard, Stack } from '../../components/ui';
import { HOME_CURRENCY } from '../../config/journeyRules';
import { MAX_LEVEL } from '../../data/archetypes';
import { useJourneyScreen } from './useJourneyScreen';
import { useKyc } from '../../hooks/useKyc';
import { useMoney } from '../../hooks/useMoney';
import { useAppState } from '../../state/AppStateContext';
import { capitalize, formatMonthYear, fromMinor, greeting } from '../../utils/format';
import { paceStatus } from '../../utils/pacing';
import { loanPrompts } from '../../utils/loans';
import { compactMinor, percent } from './format';

/** One line under the currency switch: what the chosen currency holds, or the overall picture for "All". */
function currencyLines(spread, view, money) {
  if (view === 'ALL') {
    return {
      title: `Held in ${spread.currencies.length} ${spread.currencies.length === 1 ? 'currency' : 'currencies'}`,
      detail: spread.currencies.map((c) => `${c.code} ${percent(c.share)}`).join(' · '),
    };
  }
  const c = spread.currencies.find((x) => x.code === view);
  return {
    title: `Held in ${c.code}: ${money.ksh(fromMinor(c.valueMinor))}${c.code === HOME_CURRENCY ? '' : ' est.'}`,
    detail: `${percent(c.share)} of your savings and investments`,
  };
}

/**
 * Home for members in the journey preview: position and the two money
 * actions in the ink header, shortcuts, the member's stage and progress
 * toward independence, then anything that needs their attention.
 */
export default function JourneyHomeScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const { status, error, refetch, model, accounts, loans } = useJourneyScreen();
  const { kyc } = useKyc();
  const money = useMoney();
  const [view, setView] = useState('ALL');

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const prompts = loanPrompts(loans);

  const { position, spread, stage, independence, next } = model;
  const lines = currencyLines(spread, spread.currencies.some((c) => c.code === view) ? view : 'ALL', money);
  const goal = accounts.find((a) => a.kind === 'goal' && !a.isGroup) ?? null;
  const pace = goal ? paceStatus({ createdAt: goal.createdAt, targetDate: goal.targetDate, targetMinor: goal.targetMinor, balanceMinor: goal.balanceMinor }) : null;
  const nextStep = next.items.find((i) => !i.done) ?? null;
  const netLoansMinor = position.owedToYouMinor - position.youOweMinor;

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkHeader stageId={stage.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, letterSpacing: '0.14em' }}>NOMAD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <HideBalancesButton tone="ink" />
            <button
              type="button"
              aria-label="Your profile"
              onClick={() => navigate('/profile')}
              style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(245,238,226,0.14)', color: 'var(--text-on-ink)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}
            >
              {user?.initial}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, fontWeight: 300, fontSize: 15, color: 'var(--taupe-on-ink)' }}>
          {greeting()}, {capitalize(user?.username)}
        </div>
        <Eyebrow tone="ink" top={14}>Total position · {HOME_CURRENCY}</Eyebrow>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, letterSpacing: '0.02em', lineHeight: 1.05 }}>
          {money.fmt(fromMinor(position.netWorthMinor))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Saved', position.savedMinor, '/save'],
            ['Invested', position.investedMinor, '/invest'],
            ['Loans', netLoansMinor, '/borrow'],
          ].map(([label, valueMinor, to]) => (
            <button key={label} type="button" onClick={() => navigate(to)} style={{ border: 'none', cursor: 'pointer', background: 'rgba(245,238,226,0.12)', borderRadius: 20, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--text-on-ink)' }}>
              {label} {money.hidden ? money.fmt(0) : compactMinor(valueMinor)}
            </button>
          ))}
        </div>

        {spread.currencies.length > 1 && (
          <>
            <div style={{ marginTop: 16 }}>
              <Segmented
                label="Show what you hold in each currency"
                value={spread.currencies.some((c) => c.code === view) ? view : 'ALL'}
                onChange={setView}
                options={[{ value: 'ALL', label: 'All' }, ...spread.currencies.map((c) => ({ value: c.code, label: c.code }))]}
              />
            </div>
            <div style={{ marginTop: 10, minHeight: 36 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{lines.title}</div>
              <div style={{ marginTop: 3, fontWeight: 300, fontSize: 11, lineHeight: 1.45, color: 'var(--text-on-ink-body)' }}>{lines.detail}</div>
            </div>
          </>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <PillButton variant="gold" icon="add" style={{ flex: 1.4 }} onClick={() => navigate('/deposit?account=liquid')}>Add money</PillButton>
          <PillButton variant="outlineOnInk" icon="withdraw" style={{ flex: 1 }} onClick={() => navigate('/withdraw')}>Withdraw</PillButton>
        </div>
      </InkHeader>

      <div style={{ padding: '18px 22px 0', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        <Shortcut icon="goals" label="Goals" onClick={() => navigate('/save')} />
        <Shortcut icon="statements" label="Statements" onClick={() => navigate('/statements')} />
        <Shortcut icon="balance" label="Balance sheet" onClick={() => navigate('/balance-sheet')} />
        <Shortcut icon="journey" label="The trail" onClick={() => navigate('/trail')} />
      </div>

      <div style={{ padding: '18px 22px 0' }}>
        <SoftCard onClick={() => navigate('/journey')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 21, letterSpacing: '0.05em', color: 'var(--ink-green)', textTransform: 'uppercase' }}>{stage.name}</div>
              <div style={{ marginTop: 2, fontWeight: 300, fontSize: 12, color: 'var(--text-body)' }}>
                Stage {stage.level} of {MAX_LEVEL} · {stage.terrain}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, color: 'var(--text-heading)' }}>{independence == null ? '—' : percent(independence)}</div>
              <div style={{ fontWeight: 300, fontSize: 11, color: 'var(--text-body)' }}>independent</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <RouteBar value={independence ?? 0} />
          </div>
          <div style={{ marginTop: 8, fontWeight: 300, fontSize: 12, color: 'var(--text-body)' }}>
            {independence == null
              ? 'Your monthly costs aren’t on record yet, so independence can’t be worked out.'
              : nextStep
                ? `Next: ${nextStep.label.toLowerCase()} · ${nextStep.detail.toLowerCase()}`
                : stage.motto}
          </div>
        </SoftCard>

        {(goal || (kyc && !kyc.complete) || prompts.length > 0) && (
          <>
            <Eyebrow top={24}>Needs your attention</Eyebrow>
            <Stack>
              {prompts.map((p) => (
                <SoftCard key={p.key} padding="15px 18px" onClick={() => navigate(`/loan?id=${p.loanId}`)} style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <ItemTitle size={15}>{p.title}</ItemTitle>
                  <ItemMeta>{p.amountMinor ? `${money.ksh(fromMinor(p.amountMinor))} · ` : ''}{p.detail}</ItemMeta>
                </SoftCard>
              ))}
              {goal && (
                <SoftCard padding="15px 18px" onClick={() => navigate('/save/goal')} style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <ItemTitle size={15}>{goal.name} is {pace?.behindMinor > 0 ? 'behind pace' : 'on pace'}</ItemTitle>
                  <ItemMeta>
                    {pace?.behindMinor > 0
                      ? `${money.ksh(pace.behindMinor / 100)} short of ${formatMonthYear(goal.targetDate)}`
                      : `${pace?.pctFunded ?? 0}% funded · target ${formatMonthYear(goal.targetDate)}`}
                  </ItemMeta>
                </SoftCard>
              )}
              {kyc && !kyc.complete && (
                <SoftCard padding="15px 18px" onClick={() => navigate('/kyc')} style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <ItemTitle size={15}>Finish verifying your identity</ItemTitle>
                  <ItemMeta>Step {kyc.step} of {kyc.totalSteps}</ItemMeta>
                </SoftCard>
              )}
            </Stack>
          </>
        )}
      </div>
    </div>
  );
}
