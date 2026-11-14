import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TabBar from './TabBar';
import FloatingTabBar from './FloatingTabBar';
import { useAppState } from '../state/AppStateContext';

const TAB_SCREENS = ['/home', '/save', '/save/goal', '/borrow', '/loan', '/invest'];

/**
 * `flush` drops the top padding, for screens that open with a full-width
 * ink header. Members in the journey preview get the floating tab bar on
 * every tab screen; everyone else keeps the standard one.
 */
export default function AppShell({ children, flush = false }) {
  const { pathname } = useLocation();
  const { user } = useAppState();
  const floating = !!user?.features?.journey;
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  const showTabs = TAB_SCREENS.includes(pathname);

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--surface-canvas)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: 'var(--surface-ground)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 60px rgba(34,32,26,0.10)',
          ...(floating && { position: 'relative' }),
        }}
      >
        <div ref={scrollRef} className="nomad-scroll" style={{ flex: 1, overflowY: 'auto', paddingTop: flush ? 0 : 28, ...(floating && showTabs && { paddingBottom: 84 }) }}>
          {children}
        </div>
        {showTabs && (floating ? <FloatingTabBar /> : <TabBar />)}
      </div>
    </div>
  );
}
