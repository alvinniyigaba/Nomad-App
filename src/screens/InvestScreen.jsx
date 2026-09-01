import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import TerrainPattern from '../components/ds/TerrainPattern';
import YieldCalculator from '../components/YieldCalculator';
import { fmt, ksh, fromMinor, pct, formatFullDate } from '../utils/format';
import { useExternalHoldings } from '../hooks/useExternalHoldings';
import { buildPortfolioSeries, ytdChangeMinor, chartPolylinePoints } from '../utils/investmentSeries';

const RANGES = ['1M', '6M', 'YTD', 'ALL'];
const PRODUCT_TYPE_LABEL = { savings: 'Savings account', fixed_deposit: 'Fixed deposit', investment: 'Investment', other: 'Other product' };

function HoldingCard({ title, meta, value, footer, dashed, ink, badge, details }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = !!details;

  return (
    <div
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: ink ? 'var(--surface-ink)' : 'var(--surface-card)',
        border: dashed ? '1px dashed var(--sand-line)' : ink ? '1px solid rgba(201,138,43,0.28)' : '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '18px 20px',
        boxShadow: dashed ? 'none' : ink ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: expandable ? 'pointer' : 'default',
      }}
    >
      {ink && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="ink" width={360} height={160} />
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 400, fontSize: 14, color: dashed ? 'var(--text-muted)' : ink ? 'var(--text-on-ink)' : 'var(--text-heading)' }}>{title}</div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: dashed ? 'var(--text-faint)' : ink ? 'var(--text-on-ink-body)' : 'var(--text-muted)' }}>{meta}</div>
          {footer && (
            <div style={{ marginTop: 6, fontWeight: 300, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: ink ? 'var(--taupe-on-ink)' : 'var(--text-faint)' }}>
              {footer}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          {badge ? (
            <Badge variant="gold">{badge}</Badge>
          ) : (
            value != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: ink ? 'var(--accent-gold)' : 'var(--text-heading)' }}>{fmt(value)}</div>
              </div>
            )
          )}
          {expandable && (
            <div
              style={{
                fontWeight: 300,
                fontSize: 13,
                color: 'var(--taupe-on-ink)',
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--dur-fast) var(--ease-standard)',
              }}
            >
              ↓
            </div>
          )}
        </div>
      </div>

      {expandable && expanded && (
        <div
          style={{
            position: 'relative',
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid rgba(245,238,226,0.16)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            rowGap: 14,
            columnGap: 14,
          }}
        >
          {details.map((d) => (
            <div key={d.label}>
              <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>{d.label}</div>
              <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13, color: 'var(--text-on-ink)' }}>{d.value}</div>
            </div>
          ))}
        </div>
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

      <div style={{ marginTop: 20, height: 132, background: 'var(--surface-panel)', borderRadius: 8, padding: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TerrainPattern theme="light" width={330} height={132} />
        </div>
        {points ? (
          <svg viewBox="0 0 330 104" preserveAspectRatio="none" style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }}>
            <polyline points={points} fill="none" stroke="#1F4A47" strokeWidth="1.6" />
            <line x1="0" y1="52" x2="330" y2="52" stroke="#C0A882" strokeWidth="1" strokeDasharray="2 7" />
          </svg>
        ) : (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
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
              const inception = h.history?.length ? h.history[0] : null;
              const details = [
                { label: 'Start date', value: inception ? formatFullDate(inception.date) : '—' },
                { label: 'Investment currency', value: h.investmentCurrency || '—' },
                { label: 'Interest rate', value: h.interestRateBps ? `${pct(h.interestRateBps / 100)} p.a.` : '—' },
                { label: 'Managed by', value: 'Nomad' },
                { label: 'Amount invested (UGX)', value: inception ? ksh(fromMinor(Number(inception.valueMinor))) : '—' },
              ];
              return (
                <HoldingCard
                  key={h.id}
                  title={h.providerName}
                  meta={`${PRODUCT_TYPE_LABEL[h.productType]}${h.interestRateBps ? ` · ${pct(h.interestRateBps / 100)} p.a.` : ''}`}
                  value={value != null ? fromMinor(value) : null}
                  footer={value == null ? 'No value entered yet' : null}
                  details={details}
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
