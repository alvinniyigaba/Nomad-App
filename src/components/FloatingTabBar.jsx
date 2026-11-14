import { useLocation, useNavigate } from 'react-router-dom';
import { useStage } from '../state/StageContext';
import { Icon } from './ui';
import { TABS } from '../config/tabs';

/**
 * The tab bar of the journey preview: an ink pill floating over the page,
 * each tab an icon with its label. The active tab takes the colour of the
 * member's stage, so moving up a stage shows on every screen.
 */
export default function FloatingTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { stage } = useStage();

  return (
    <nav style={{ position: 'absolute', left: 14, right: 14, bottom: 14, display: 'flex', background: 'var(--ink-green)', borderRadius: 22, padding: 6, boxShadow: 'var(--shadow-lg)' }}>
      {TABS.map((tab) => {
        const active = tab.match.includes(pathname);
        const color = active ? stage.onColor : 'var(--taupe-on-ink)';
        return (
          <button
            key={tab.path}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              minHeight: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: 0,
              border: 'none',
              borderRadius: 17,
              cursor: 'pointer',
              background: active ? stage.color : 'transparent',
              color,
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: '0.1em',
            }}
          >
            <Icon name={tab.icon} size={21} color={color} accent={color} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
