import { useNavigate } from 'react-router-dom';
import { Loading, ErrorState } from '../components/ScreenState';
import TerrainPattern from '../components/ds/TerrainPattern';
import { position } from '../data/mockData';
import { fmt, ksh, fromMinor } from '../utils/format';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from '../hooks/useAccounts';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { totalInvestedMinor } from '../utils/investmentSeries';

function Row({ label, value, muted, indent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border-default)', paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontWeight: 300, fontSize: 13, color: muted ? 'var(--text-faint)' : 'var(--text-body)' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, color: muted ? 'var(--text-faint)' : 'var(--text-heading)' }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ marginTop: 26, marginBottom: 4, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}

export default function PositionSummaryScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const { holdings: externalHoldings } = useExternalHoldings();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const individualSaved = fromMinor(goal.balanceMinor) + fromMinor(liquid.balanceMinor);
  const groupTotal = groupGoals.reduce((sum, g) => sum + fromMinor(g.balanceMinor), 0);
  const nomadHoldings = externalHoldings.filter((h) => h.managedBy === 'nomad' && h.status === 'active');
  const invested = fromMinor(totalInvestedMinor(externalHoldings));
  const externalTotal = externalHoldings
    .filter((h) => h.managedBy === 'external')
    .reduce((sum, h) => sum + (h.balanceMinor != null ? fromMinor(h.balanceMinor) : 0), 0);
  // Same fields Home's collapsed card sums, plus group goals — keeps the two screens' totals from ever silently diverging.
  const total = individualSaved + groupTotal + invested - position.owed;

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          YOUR POSITION
        </div>
      </div>

      <div style={{ marginTop: 20, position: 'relative', overflow: 'hidden', background: 'var(--surface-ink)', border: '1px solid rgba(201,138,43,0.28)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="ink" width={360} height={200} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-on-ink)' }}>
            {ksh(total)}
          </div>
          <div style={{ marginTop: 6, fontWeight: 400, fontSize: 12, color: 'var(--accent-gold)' }}>+{ksh(position.monthChange)} this month</div>
        </div>
      </div>

      <SectionLabel>Savings</SectionLabel>
      <div onClick={() => navigate('/save/goal')} style={{ cursor: 'pointer' }}>
        <Row label={goal.name} value={fmt(fromMinor(goal.balanceMinor))} />
      </div>
      <Row label={liquid.name} value={fmt(fromMinor(liquid.balanceMinor))} />

      {groupGoals.length > 0 && (
        <>
          <SectionLabel>Group goals</SectionLabel>
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

      <SectionLabel>Investments</SectionLabel>
      {nomadHoldings.length > 0 ? (
        nomadHoldings.map((h) => {
          const latest = h.history?.length ? fromMinor(Number(h.history[h.history.length - 1].valueMinor)) : null;
          return (
            <div key={h.id} onClick={() => navigate('/invest')} style={{ cursor: 'pointer' }}>
              <Row label={h.providerName} value={latest != null ? fmt(latest) : '—'} />
            </div>
          );
        })
      ) : (
        <div onClick={() => navigate('/invest')} style={{ cursor: 'pointer' }}>
          <Row label="Invested" value={fmt(0)} muted />
        </div>
      )}

      <SectionLabel>Other</SectionLabel>
      <div onClick={() => navigate('/loan')} style={{ cursor: 'pointer' }}>
        <Row label="Owed" value={fmt(position.owed)} />
      </div>

      {externalTotal > 0 && (
        <>
          <SectionLabel>External (self-reported)</SectionLabel>
          {externalHoldings
            .filter((h) => h.managedBy === 'external')
            .map((h) => (
              <Row key={h.id} label={h.providerName} value={h.balanceMinor != null ? fmt(fromMinor(h.balanceMinor)) : '—'} muted />
            ))}
          <div style={{ marginTop: 10, fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
            {ksh(externalTotal)} across products Nomad doesn't manage — not included in the total above.
          </div>
        </>
      )}
    </div>
  );
}
