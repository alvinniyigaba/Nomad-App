import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import YieldCalculator from '../components/YieldCalculator';
import { fmt, ksh, fromMinor, pct } from '../utils/format';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { buildPortfolioSeries, ytdChangeMinor, chartPolylinePoints } from '../utils/investmentSeries';

const RANGES = ['1M', '6M', 'YTD', 'ALL'];
const PRODUCT_TYPE_LABEL = { savings: 'Savings account', fixed_deposit: 'Fixed deposit', investment: 'Investment', other: 'Other product' };

function HoldingCard({ title, meta, value, footer, dashed, ink, badge }) {
  return (
    <div
      style={{
        background: ink ? 'var(--surface-ink)' : 'var(--surface-card)',
        border: dashed ? '1px dashed var(--sand-line)' : ink ? '1px solid rgba(201,138,43,0.28)' : '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '18px 20px',
        boxShadow: dashed ? 'none' : ink ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 400, fontSize: 14, color: dashed ? 'var(--text-muted)' : ink ? 'var(--text-on-ink)' : 'var(--text-heading)' }}>{title}</div>
        <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: dashed ? 'var(--text-faint)' : ink ? 'var(--text-on-ink-body)' : 'var(--text-muted)' }}>{meta}</div>
        {footer && (
          <div style={{ marginTop: 6, fontWeight: 300, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: ink ? 'var(--taupe-on-ink)' : 'var(--text-faint)' }}>
            {footer}
          </div>
        )}
      </div>
      {badge ? (
        <Badge variant="gold">{badge}</Badge>
      ) : (
        value != null && (
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: ink ? 'var(--accent-gold)' : 'var(--text-heading)' }}>{fmt(value)}</div>
          </div>
        )
      )}
    </div>
  );
}

export default function InvestScreen() {
  const navigate = useNavigate();
  const { holdings } = useExternalHoldings();

  const nomadActive = holdings.filter((h) => h.managedBy === 'nomad' && h.status === 'active');
  const nomadInvited = holdings.filter((h) => h.managedBy === 'nomad' && h.status === 'invited');
  const external = holdings.filter((h) => h.managedBy === 'external');

  const series = buildPortfolioSeries(holdings);
  const totalMinor = series.length ? series[series.length - 1].totalMinor : 0;
  const ytdChange = ytdChangeMinor(series);
  const ytdPct = totalMinor - ytdChange !== 0 ? (ytdChange / (totalMinor - ytdChange)) * 100 : 0;
  const points = chartPolylinePoints(series);

  function latestValue(h) {
    if (!h.history?.length) return null;
    return Number(h.history[h.history.length - 1].valueMinor);
  }

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          INVESTMENTS
        </div>
        <div onClick={() => navigate('/statements')} style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', cursor: 'pointer' }}>
          LETTERS
        </div>
      </div>

      <div style={{ marginTop: 22, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 32, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>
        {ksh(fromMinor(totalMinor))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: ytdChange >= 0 ? 'var(--success)' : 'var(--accent-clay)' }}>
          {ytdChange >= 0 ? '+' : ''}
          {ksh(fromMinor(ytdChange))}
        </span>
        <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{ytdPct >= 0 ? '+' : ''}{ytdPct.toFixed(1)}% year to date</span>
      </div>

      <div style={{ marginTop: 20, height: 132, background: 'var(--surface-panel)', borderRadius: 8, padding: 14, position: 'relative' }}>
        {points ? (
          <svg viewBox="0 0 330 104" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
            <polyline points={points} fill="none" stroke="#1F4A47" strokeWidth="1.6" />
            <line x1="0" y1="52" x2="330" y2="52" stroke="#C0A882" strokeWidth="1" strokeDasharray="2 7" />
          </svg>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
            No performance history yet
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {RANGES.map((r, i) => (
          <div
            key={r}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '11px 0',
              border: `1px solid ${i === 0 ? 'var(--ink-green)' : 'var(--border-default)'}`,
              borderRadius: 4,
              fontWeight: i === 0 ? 500 : 400,
              fontSize: 10,
              letterSpacing: '0.14em',
              color: i === 0 ? 'var(--ink-green)' : 'var(--text-muted)',
            }}
          >
            {r}
          </div>
        ))}
      </div>

      {(nomadActive.length > 0 || nomadInvited.length > 0) && (
        <>
          <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Holdings
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nomadInvited.map((h) => (
              <HoldingCard key={h.id} title={h.providerName} meta={h.notes || 'Invitation open'} dashed badge="Invited" />
            ))}
            {nomadActive.map((h) => {
              const value = latestValue(h);
              return (
                <HoldingCard
                  key={h.id}
                  title={h.providerName}
                  meta={`${PRODUCT_TYPE_LABEL[h.productType]}${h.interestRateBps ? ` · ${pct(h.interestRateBps / 100)} p.a.` : ''}`}
                  value={value != null ? fromMinor(value) : null}
                  footer={value == null ? 'No value entered yet' : null}
                  ink
                />
              );
            })}
          </div>
        </>
      )}

      {external.length > 0 && (
        <>
          <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            External
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {external.map((h) => (
              <HoldingCard
                key={h.id}
                title={h.providerName}
                meta={`${PRODUCT_TYPE_LABEL[h.productType]}${h.interestRateBps ? ` · ${pct(h.interestRateBps / 100)} p.a.` : ''}${h.termMonths ? ` · ${h.termMonths}mo term` : ''}`}
                footer="External · not managed by Nomad"
                value={h.balanceMinor != null ? fromMinor(h.balanceMinor) : null}
              />
            ))}
          </div>
        </>
      )}

      <YieldCalculator holdings={nomadActive} />
    </div>
  );
}
