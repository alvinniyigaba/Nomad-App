import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import { documents } from '../data/mockData';
import { useAppState } from '../state/AppStateContext';

const FILTERS = ['ALL', 'SAVINGS', 'LOAN', 'FUNDS'];

export default function StatementsScreen() {
  const navigate = useNavigate();
  const { user, emailStatements, toggleEmailStatements, lockApp } = useAppState();

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          DOCUMENTS
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 20 }}>
        {FILTERS.map((f, i) => (
          <div
            key={f}
            style={{
              padding: '11px 15px',
              border: `1px solid ${i === 0 ? 'var(--ink-green)' : 'var(--border-default)'}`,
              borderRadius: 4,
              fontWeight: i === 0 ? 500 : 400,
              fontSize: 10,
              letterSpacing: '0.14em',
              color: i === 0 ? 'var(--ink-green)' : 'var(--text-muted)',
            }}
          >
            {f}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        2026
      </div>
      {documents.map((doc) => (
        <div key={doc.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 42, background: 'var(--bone-panel)', border: '1px solid var(--border-default)', borderRadius: 3, flex: 'none' }} />
            <div>
              <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-heading)' }}>{doc.title}</div>
              <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>{doc.meta}</div>
            </div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', padding: '14px 4px', margin: '-14px -4px', cursor: 'pointer' }}>
            GET
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '17px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Custom statement</div>
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>Pick a date range and accounts</div>
          </div>
          <div style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>→</div>
        </div>
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '17px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Email monthly statements</div>
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <Toggle on={emailStatements} onClick={toggleEmailStatements} />
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <Button
          variant="ghost"
          size="md"
          full
          onClick={async () => {
            await lockApp();
            navigate('/login', { replace: true });
          }}
        >
          Lock the app
        </Button>
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
        Issued by Nomad Ventures LLP. Settled transactions only.
      </div>
    </div>
  );
}
