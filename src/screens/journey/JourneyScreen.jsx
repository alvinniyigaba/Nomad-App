import { useNavigate } from 'react-router-dom';
import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, Icon, InkBackHeader, ItemMeta, ItemTitle, PillButton, RouteBar, SoftCard, StageTerrain } from '../../components/ui';
import { MAX_LEVEL } from '../../data/archetypes';
import { useMoney } from '../../hooks/useMoney';
import { fromMinor } from '../../utils/format';
import { percent } from './format';
import { useJourneyScreen } from './useJourneyScreen';

const SOURCE_NOTE = {
  override: 'Nomad set this stage for you.',
  balance_sheet: 'Worked out from your balance sheet. It moves as your numbers do.',
  age: 'A starting point from your age. Your balance sheet takes over once your monthly costs are on record.',
  default: 'A starting point. Your balance sheet takes over once your monthly costs are on record.',
};

function Row({ label, value, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--surface-panel)', fontSize: 13 }}>
      <span style={{ fontWeight: 300, color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{value}</span>
    </div>
  );
}

/** The member's stage: what it is and why they are there, how independent they are, and what the next level asks. */
export default function JourneyScreen() {
  const navigate = useNavigate();
  const { status, error, refetch, model } = useJourneyScreen();
  const { ksh } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const { stage, placement, independence, runway, passiveIncomeMinor, expensesMonthlyMinor, hasCosts, next } = model;

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkBackHeader stageId={stage.id} title="YOUR JOURNEY" to="/home" />

      <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: stage.color, color: stage.onColor, borderRadius: 20, padding: '18px 20px' }}>
          <StageTerrain stageId={stage.id} width={346} height={190} color={stage.onColor} opacity={0.16} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Stage {stage.level} of {MAX_LEVEL} · {stage.terrain}
            </div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 30, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{stage.name}</div>
            <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>After the {stage.people}</div>
            <div style={{ marginTop: 10, fontWeight: 400, fontSize: 13, lineHeight: 1.55 }}>{stage.story}</div>
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{stage.focus}</div>
          </div>
        </div>

        <SoftCard>
          <Eyebrow>Financial independence</Eyebrow>
          {hasCosts ? (
            <>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 36, color: 'var(--ink-green)' }}>{percent(independence)}</span>
                <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-body)' }}>of your day-to-day costs covered</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <RouteBar value={independence} />
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 300, fontSize: 11, color: 'var(--text-body)' }}>
                <span>Start</span>
                <span>Free at 100%</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Row label="Passive income a month" value={ksh(fromMinor(passiveIncomeMinor))} />
                <Row label="Day-to-day costs a month" value={ksh(fromMinor(expensesMonthlyMinor))} />
                <Row label="Runway" value={`${runway.toFixed(1)} months`} last />
              </div>
              <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>
                Passive income is what your holdings are projected to earn at the rates on record, plus any passive income Nomad has recorded for you. Runway is your liquid fund against your monthly costs.
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8, fontWeight: 300, fontSize: 13, lineHeight: 1.6, color: 'var(--text-body)' }}>
              Independence is your passive income against your day-to-day costs. Your costs aren’t on record yet, so it can’t be worked out. Send Nomad your monthly costs (household, rent, school fees, medical, transport) and it appears here.
            </div>
          )}
          <PillButton icon="balance" style={{ marginTop: 14, width: '100%', minHeight: 46 }} onClick={() => navigate('/balance-sheet')}>See balance sheet</PillButton>
        </SoftCard>

        <SoftCard>
          <Eyebrow>Why you are here</Eyebrow>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontWeight: 400, fontSize: 13, lineHeight: 1.7, color: 'var(--text-heading)' }}>
            {placement.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div style={{ marginTop: 8, fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-body)' }}>{SOURCE_NOTE[placement.source]}</div>
        </SoftCard>

        {next.target && (
          <SoftCard>
            <Eyebrow>To reach {next.target}</Eyebrow>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {next.items.map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', width: 14, height: 14, boxSizing: 'border-box', borderRadius: 8, border: `2px ${item.unknown ? 'dashed' : 'solid'} ${item.done ? 'var(--ink-green)' : 'var(--ochre-gold)'}`, background: item.done ? 'var(--ink-green)' : 'transparent' }}
                  />
                  <div style={{ flex: 1 }}>
                    <ItemTitle>{item.label}</ItemTitle>
                    <ItemMeta top={2}>{item.done ? 'Done' : item.detail}</ItemMeta>
                  </div>
                </div>
              ))}
            </div>
          </SoftCard>
        )}

        <SoftCard padding="14px 18px" onClick={() => navigate('/trail')} style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 20, background: 'var(--surface-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="journey" />
            </span>
            <div style={{ flex: 1 }}>
              <ItemTitle>See the whole trail</ItemTitle>
              <ItemMeta top={2}>All seven stages and where you stand</ItemMeta>
            </div>
            <Icon name="forward" size={18} />
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
