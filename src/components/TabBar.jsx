import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { label: 'HOME', path: '/home', match: ['/home'] },
  { label: 'SAVE', path: '/save', match: ['/save', '/save/goal'] },
  { label: 'BORROW', path: '/borrow', match: ['/borrow', '/loan'] },
  { label: 'INVEST', path: '/invest', match: ['/invest'] },
  { label: 'DOCS', path: '/statements', match: ['/statements'] },
];

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bone-warm)',
        padding: '14px 0 20px',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.match.includes(pathname);
        return (
          <div
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 10,
              letterSpacing: '0.18em',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: active ? 'var(--ink-green)' : 'var(--text-faint)',
            }}
          >
            {tab.label}
          </div>
        );
      })}
    </div>
  );
}
