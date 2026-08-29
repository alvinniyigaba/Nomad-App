import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { documents, customer } from '../data/mockData';
import { useAppState } from '../state/AppStateContext';

const FILTERS = ['ALL', 'SAVINGS', 'LOAN', 'FUNDS'];

export default function StatementsScreen() {
  const navigate = useNavigate();
  const { emailStatements, toggleEmailStatements, logout } = useAppState();

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
        DOCUMENTS
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
            <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{customer.email}</div>
          </div>
          <div
            onClick={toggleEmailStatements}
            style={{
              width: 46,
              height: 27,
              borderRadius: 14,
              position: 'relative',
              flex: 'none',
              cursor: 'pointer',
              background: emailStatements ? 'var(--ink-green)' : 'var(--sand-line)',
            }}
          >
            <div style={{ position: 'absolute', top: 3, width: 21, height: 21, background: 'var(--bone)', borderRadius: 11, left: emailStatements ? 22 : 3 }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <Button
          variant="ghost"
          size="md"
          full
          onClick={() => {
            logout();
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
