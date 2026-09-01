import { useEffect, useState } from 'react';
import { ksh, fromMinor } from '../utils/format';
import { estimateYield, MANAGEMENT_FEE_PCT } from '../utils/yieldCalculator';

function inputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '12px 14px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: 14,
    color: 'var(--text-heading)',
    outline: 'none',
  };
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function YieldCalculator({ holdings = [] }) {
  // Holdings load asynchronously, so the "default from your real holdings"
  // values are seeded via effect once they arrive, not a useState initializer
  // (which would only ever see the empty array present on first render) —
  // and only while the user hasn't touched the field themselves.
  const [principal, setPrincipal] = useState(null);
  const [monthly, setMonthly] = useState(0);
  const [rate, setRate] = useState(null);
  const [years, setYears] = useState(2);
  const [transactionCostPct, setTransactionCostPct] = useState(1);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!holdings.length) return;
    if (principal === null) {
      const total = holdings.reduce((sum, h) => sum + (h.history?.length ? Number(h.history[h.history.length - 1].valueMinor) : 0), 0);
      setPrincipal(Math.round(fromMinor(total)));
    }
    if (rate === null) {
      const rates = holdings.map((h) => h.interestRateBps).filter((r) => r != null);
      setRate(rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length / 100 : 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  const result = estimateYield({
    principal: Number(principal) || 0,
    monthlyContribution: Number(monthly) || 0,
    annualRatePct: Number(rate ?? 10) || 0,
    years: Number(years) || 0,
    transactionCostPct: Number(transactionCostPct) || 0,
  });

  return (
    <div style={{ marginTop: 30, border: '1px solid var(--ink-green)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
        style={{
          background: 'var(--surface-panel)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Yield calculator
          </div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
            {expanded ? 'An estimate, not a guarantee — actual returns vary.' : `Projected ${ksh(result.netValue)} after ${years || 0} ${Number(years) === 1 ? 'year' : 'years'}`}
          </div>
        </div>
        <div
          style={{
            fontWeight: 300,
            fontSize: 15,
            color: 'var(--text-muted)',
            flex: 'none',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--dur-fast) var(--ease-standard)',
          }}
        >
          ↓
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Starting amount (UGX)">
              <input style={inputStyle()} type="number" min="0" value={principal ?? 0} onChange={(e) => setPrincipal(e.target.value)} />
            </Field>
            <Field label="Monthly top-up (UGX)">
              <input style={inputStyle()} type="number" min="0" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </Field>
            <Field label="Expected return (% p.a.)">
              <input style={inputStyle()} type="number" min="0" step="0.1" value={rate ?? 10} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label="Years">
              <input style={inputStyle()} type="number" min="0" step="1" value={years} onChange={(e) => setYears(e.target.value)} />
            </Field>
            <Field label="Estimated transaction cost (%)">
              <input style={inputStyle()} type="number" min="0" step="0.1" value={transactionCostPct} onChange={(e) => setTransactionCostPct(e.target.value)} />
            </Field>
            <Field label="Nomad management fee">
              <div style={{ ...inputStyle(), color: 'var(--text-muted)' }}>{MANAGEMENT_FEE_PCT}% p.a. (standard)</div>
            </Field>
          </div>

          <div style={{ marginTop: 18, background: 'var(--surface-panel)', borderRadius: 8, padding: '17px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>Before fees and costs</span>
              <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-muted)' }}>{ksh(result.grossValue)}</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>Estimated cost impact</span>
              <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--accent-clay)' }}>-{ksh(result.totalCost)}</span>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-body)' }}>Projected after {years || 0} {Number(years) === 1 ? 'year' : 'years'}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20, color: 'var(--text-heading)' }}>{ksh(result.netValue)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
