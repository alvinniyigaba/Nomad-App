import { useNavigate } from 'react-router-dom';
import HideBalancesButton from '../../components/HideBalancesButton';
import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, InkHeader, SoftCard, Tag } from '../../components/ui';
import { HOME_CURRENCY } from '../../config/journeyRules';
import { useMoney } from '../../hooks/useMoney';
import { fromMinor } from '../../utils/format';
import InvestmentsBody from '../invest/InvestmentsBody';
import { compactMinor, percent } from './format';
import SpreadRings from './SpreadRings';
import { useJourneyScreen } from './useJourneyScreen';

const RING_NOTE = { home: HOME_CURRENCY, region: 'East Africa', world: 'Elsewhere' };

/** The advisory under the rings: where the member sits against the guide for their stage, and which way to lean. */
function spreadAdvice(check, stageName) {
  const home = percent(check.homeShare);
  const range = `${percent(check.guide.min)}–${percent(check.guide.max)}`;
  if (check.status === 'in_range') {
    return { badge: 'In range', text: `${home} of your savings and investments are at home. The guide for a ${stageName} is ${range}.` };
  }
  if (check.status === 'low') {
    const away = check.largestAway ? ` Most of the rest is in ${check.largestAway.code}, so a move in that currency would affect you most.` : '';
    return { badge: 'Below guide', text: `${home} is at home, under the ${range} guide for a ${stageName}.${away} Adding to a ${HOME_CURRENCY} goal or holding brings you back toward range.` };
  }
  return { badge: 'Above guide', text: `${home} is at home, over the ${range} guide for a ${stageName}. Nearly everything rides on one currency; a holding in another would spread that.` };
}

/**
 * Invest for members in the journey preview. Opens with how the member's
 * money is spread from home and a check against the guide for their stage,
 * then what their holdings earn and how they split by sector, then the
 * same performance chart and holding cards as the current Invest screen.
 */
export default function JourneyInvestScreen() {
  const navigate = useNavigate();
  const { status, error, refetch, model, holdings } = useJourneyScreen();
  const { fmt, ksh, hidden } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const { stage, position, spread, spreadCheck, sectors, holdingsIncomeMinor, expensesMonthlyMinor, hasCosts } = model;
  const advice = spreadCheck ? spreadAdvice(spreadCheck, stage.name) : null;
  const labelled = sectors.some((s) => s.sector !== null);

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkHeader stageId={stage.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '0.12em' }}>INVESTMENTS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <HideBalancesButton tone="ink" />
            <button type="button" onClick={() => navigate('/statements')} style={{ padding: 0, minHeight: 32, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-on-ink)' }}>
              LETTERS
            </button>
          </div>
        </div>
        <Eyebrow tone="ink" top={6}>Invested · {HOME_CURRENCY}</Eyebrow>
        <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32 }}>{fmt(fromMinor(position.investedMinor))}</div>

        {spread.totalMinor > 0 && (
          <>
            <Eyebrow tone="ink" top={18}>Your spread · savings and investments</Eyebrow>
            <SpreadRings rings={spread.rings} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, textAlign: 'center' }}>
              {spread.rings.map((r) => (
                <div key={r.id} style={{ background: 'rgba(245,238,226,0.1)', borderRadius: 14, padding: '8px 4px' }}>
                  <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>{r.label}</div>
                  <div style={{ marginTop: 2, fontWeight: 600, fontSize: 13 }}>{hidden ? fmt(0) : compactMinor(r.valueMinor)}</div>
                  <div style={{ fontWeight: 300, fontSize: 10, color: 'var(--text-on-ink-body)' }}>{RING_NOTE[r.id]}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {advice && (
          <div style={{ marginTop: 14, background: 'var(--surface-ground)', borderRadius: 18, padding: '14px 16px', color: 'var(--text-heading)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.2em', color: 'var(--accent-clay)' }}>SPREAD CHECK</span>
              <Tag background={spreadCheck.status === 'in_range' ? 'var(--surface-panel)' : 'var(--ochre-gold)'} color="var(--earth-900)">{advice.badge.toUpperCase()}</Tag>
            </div>
            <div style={{ marginTop: 6, fontWeight: 400, fontSize: 13, lineHeight: 1.5 }}>{advice.text}</div>
            <div style={{ marginTop: 6, fontWeight: 300, fontSize: 11, lineHeight: 1.5, color: 'var(--text-body)' }}>
              Values held in other currencies are {HOME_CURRENCY} estimates. The guide ranges are provisional, and this is a prompt to think, not investment advice.
            </div>
          </div>
        )}
      </InkHeader>

      <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {holdingsIncomeMinor > 0 && (
          <SoftCard onClick={() => navigate('/journey')} style={{ background: stage.color, color: stage.onColor, boxShadow: 'none' }}>
            <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.2em' }}>WHAT THIS EARNS YOU</div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>About {ksh(fromMinor(holdingsIncomeMinor))} a month</div>
            <div style={{ marginTop: 2, fontWeight: 500, fontSize: 12, lineHeight: 1.5 }}>
              Projected from the rates on record, not income received.
              {hasCosts && ` That is ${percent(holdingsIncomeMinor / expensesMonthlyMinor)} of your day-to-day costs.`}
            </div>
          </SoftCard>
        )}

        {sectors.length > 0 && (
          <SoftCard>
            <Eyebrow>By sector</Eyebrow>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sectors.map((s) => (
                <div key={s.sector ?? 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13 }}>
                    <span style={{ fontWeight: s.sector ? 500 : 300, color: s.sector ? 'var(--text-heading)' : 'var(--text-body)' }}>{s.sector ?? 'Not labelled yet'}</span>
                    <span style={{ fontWeight: 300, color: 'var(--text-body)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{percent(s.share)}</span> · {fmt(fromMinor(s.valueMinor))}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: 'var(--surface-panel)', overflow: 'hidden' }}>
                    <div style={{ width: `${s.share * 100}%`, height: 6, borderRadius: 3, background: s.sector ? 'var(--ink-green)' : 'var(--sand-line)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontWeight: 300, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>
              {labelled ? 'Across everything you hold, whichever country or currency it is in.' : 'Your holdings don’t have sectors yet. Nomad adds them from your investment sheet.'}
            </div>
          </SoftCard>
        )}

        <div>
          <Eyebrow top={4}>Performance · managed by Nomad</Eyebrow>
          <InvestmentsBody holdings={holdings} />
        </div>
      </div>
    </div>
  );
}
