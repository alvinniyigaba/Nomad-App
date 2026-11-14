import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import { documents } from '../data/mockData';
import { useAppState } from '../state/AppStateContext';
import { BackTitle, Card, Eyebrow, ItemMeta, ItemTitle, Screen, Stack } from '../components/ui';

const FILTERS = ['ALL', 'SAVINGS', 'LOAN', 'FUNDS'];

export default function StatementsScreen() {
  const navigate = useNavigate();
  const { user, emailStatements, toggleEmailStatements, lockApp } = useAppState();

  return (
    <Screen>
      <BackTitle onBack={() => navigate('/profile')}>
        DOCUMENTS
      </BackTitle>
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

      <Eyebrow top={24}>2026</Eyebrow>
      {documents.map((doc) => (
        <div key={doc.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 42, background: 'var(--bone-panel)', border: '1px solid var(--border-default)', borderRadius: 3, flex: 'none' }} />
            <div>
              <ItemTitle size={13}>{doc.title}</ItemTitle>
              <div style={{ marginTop: 4, fontWeight: 300, fontSize: 11, color: 'var(--text-faint)' }}>{doc.meta}</div>
            </div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)', padding: '14px 4px', margin: '-14px -4px', cursor: 'pointer' }}>
            GET
          </div>
        </div>
      ))}

      <Stack top={20}>
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
            <ItemTitle>Custom statement</ItemTitle>
            <ItemMeta>Pick a date range and accounts</ItemMeta>
          </div>
          <div style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>→</div>
        </div>
        <Card padding="17px 20px" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <ItemTitle>Email monthly statements</ItemTitle>
            <ItemMeta>{user?.email}</ItemMeta>
          </div>
          <Toggle on={emailStatements} onClick={toggleEmailStatements} />
        </Card>
      </Stack>

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
    </Screen>
  );
}
