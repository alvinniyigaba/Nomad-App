import { useState } from 'react';
import Badge from '../../components/ds/Badge';
import YieldCalculator from '../../components/YieldCalculator';
import { fromMinor, pct, formatFullDate } from '../../utils/format';
import { useMoney } from '../../hooks/useMoney';
import { buildPortfolioSeries, ytdChangeMinor, chartPolylinePoints } from '../../utils/investmentSeries';
import { Eyebrow, Stack, TerrainBackdrop } from '../../components/ui';

const RANGES = ['1M', '6M', 'YTD', 'ALL'];
const PRODUCT_TYPE_LABEL = { savings: 'Savings account', fixed_deposit: 'Fixed deposit', investment: 'Investment', other: 'Other product' };

function HoldingCard({ title, meta, value, footer, dashed, ink, badge, details }) {
  const [expanded, setExpanded] = useState(false);
  const { fmt } = useMoney();
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
        <TerrainBackdrop theme="ink" width={360} height={160} />
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
            <div key={d.label} style={d.wide ? { gridColumn: '1 / -1' } : undefined}>
              <Eyebrow tone="ink" tracking="0.14em">{d.label}</Eyebrow>
              <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: 'var(--text-on-ink)' }}>{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Everything below the headline figure on Invest: year-to-date change, the
 * performance chart, each holding's card and the yield calculator. Shared
 * by the current Invest screen and the journey preview's.
 */
export default function InvestmentsBody({ holdings }) {
  const { ksh } = useMoney();

  const nomadActive = holdings.filter((h) => h.managedBy === 'nomad' && h.status === 'active');
  const nomadInvited = holdings.filter((h) => h.managedBy === 'nomad' && h.status === 'invited');
  const external = holdings.filter((h) => h.managedBy === 'external');

  // The chart and year-to-date figures are a performance curve, so they
  // only use holdings with snapshot history (Nomad-managed).
  const series = buildPortfolioSeries(holdings);
  const seriesMinor = series.length ? series[series.length - 1].totalMinor : 0;
  const ytdChange = ytdChangeMinor(series);
  const ytdPct = seriesMinor - ytdChange !== 0 ? (ytdChange / (seriesMinor - ytdChange)) * 100 : 0;
  const points = chartPolylinePoints(series);

  function latestValue(h) {
    if (!h.history?.length) return null;
    return Number(h.history[h.history.length - 1].valueMinor);
  }

  return (
    <>
      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: ytdChange >= 0 ? 'var(--success)' : 'var(--accent-clay)' }}>
          {ytdChange >= 0 ? '+' : ''}
          {ksh(fromMinor(ytdChange))}
        </span>
        <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{ytdPct >= 0 ? '+' : ''}{ytdPct.toFixed(1)}% year to date</span>
      </div>

      <div style={{ marginTop: 20, height: 132, background: 'var(--surface-panel)', borderRadius: 8, padding: 14, position: 'relative', overflow: 'hidden' }}>
        <TerrainBackdrop theme="light" width={330} height={132} />
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
          <Eyebrow top={26}>Holdings</Eyebrow>
          <Stack>
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
          </Stack>
        </>
      )}

      {external.length > 0 && (
        <>
          <Eyebrow top={26}>External</Eyebrow>
          <Stack>
            {external.map((h) => {
              // Same fields as a Nomad card, but read from the holding itself —
              // an external holding has no snapshot history to derive them from.
              const details = [
                { label: 'Start date', value: h.startDate ? formatFullDate(h.startDate) : '—' },
                { label: 'Investment currency', value: h.investmentCurrency || '—' },
                { label: 'Interest rate', value: h.interestRateBps ? `${pct(h.interestRateBps / 100)} p.a.` : '—' },
                { label: 'Managed by', value: h.providerName },
                { label: 'Amount invested (UGX)', value: h.investedMinor != null ? ksh(fromMinor(h.investedMinor)) : '—' },
              ];
              if (h.termMonths) details.push({ label: 'Term', value: `${h.termMonths} months` });
              if (h.maturityDate) details.push({ label: 'Maturity', value: formatFullDate(h.maturityDate) });
              if (h.notes) details.push({ label: 'Notes', value: h.notes, wide: true });
              return (
                <HoldingCard
                  key={h.id}
                  title={h.providerName}
                  meta={`${PRODUCT_TYPE_LABEL[h.productType]}${h.interestRateBps ? ` · ${pct(h.interestRateBps / 100)} p.a.` : ''}${h.termMonths ? ` · ${h.termMonths}mo term` : ''}`}
                  value={h.balanceMinor != null ? fromMinor(h.balanceMinor) : null}
                  footer={h.balanceMinor == null ? 'No value entered yet' : null}
                  details={details}
                  ink
                />
              );
            })}
          </Stack>
        </>
      )}

      <YieldCalculator holdings={nomadActive} />
    </>
  );
}
