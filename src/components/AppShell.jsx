import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TabBar from './TabBar';

const TAB_SCREENS = ['/home', '/save', '/save/goal', '/borrow', '/loan', '/invest', '/statements'];

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  const showTabs = TAB_SCREENS.includes(pathname);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--surface-canvas)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: '100vh',
          background: 'var(--surface-ground)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 60px rgba(34,32,26,0.10)',
        }}
      >
        <div ref={scrollRef} className="nomad-scroll" style={{ flex: 1, overflowY: 'auto', paddingTop: 28 }}>
          {children}
        </div>
        {showTabs && <TabBar />}
      </div>
    </div>
  );
}
