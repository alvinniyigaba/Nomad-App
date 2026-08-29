import { useNavigate } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import { investments } from '../data/mockData';
import { fmt, ksh } from '../utils/format';

const RANGES = ['1M', '6M', 'YTD', 'ALL'];

export default function InvestScreen() {
  const navigate = useNavigate();

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
        {ksh(investments.total)}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--success)' }}>+{ksh(investments.ytdChange)}</span>
        <span style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>+{investments.ytdPct}% year to date</span>
      </div>

      <div style={{ marginTop: 20, height: 132, background: 'var(--surface-panel)', borderRadius: 8, padding: 14, position: 'relative' }}>
        <svg viewBox="0 0 330 104" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          <polyline points={investments.chartPoints} fill="none" stroke="#1F4A47" strokeWidth="1.6" />
          <line x1="0" y1="52" x2="330" y2="52" stroke="#C0A882" strokeWidth="1" strokeDasharray="2 7" />
          <circle cx="330" cy="14" r="4.5" fill="none" stroke="#C98A2B" strokeWidth="1.6" />
          <circle cx="330" cy="14" r="1.6" fill="#C98A2B" />
        </svg>
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

      <div style={{ marginTop: 26, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Holdings
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {investments.holdings.map((h) => {
          if (h.kind === 'invite') {
            return (
              <div
                key={h.id}
                style={{
                  border: '1px dashed var(--sand-line)',
                  borderRadius: 8,
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-muted)' }}>{h.name}</div>
                  <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>{h.meta}</div>
                </div>
                <Badge variant="gold">Invited</Badge>
              </div>
            );
          }
          if (h.kind === 'lp') {
            return (
              <div
                key={h.id}
                style={{ background: 'var(--surface-ink)', border: '1px solid rgba(201,138,43,0.28)', borderRadius: 8, padding: '18px 20px', boxShadow: 'var(--shadow-md)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-on-ink)' }}>{h.name}</div>
                    <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-on-ink-body)' }}>{h.meta}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--accent-gold)' }}>{fmt(h.value)}</div>
                    <div style={{ marginTop: 5, fontWeight: 300, fontSize: 11, color: 'var(--taupe-on-ink)' }}>{h.note}</div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div
              key={h.id}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>{h.name}</div>
                <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{h.meta}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-heading)' }}>{fmt(h.value)}</div>
                <div style={{ marginTop: 5, fontWeight: 400, fontSize: 11, color: 'var(--success)' }}>+{h.changePct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
