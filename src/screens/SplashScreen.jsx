import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import TerrainPattern from '../components/ds/TerrainPattern';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login', { replace: true }), 2100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--surface-ink-deep)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <TerrainPattern theme="ink" width={480} height={960} />
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'nomad-fade 700ms ease-out both',
        }}
      >
        <NomadLogo brand="group" layout="stacked" theme="ink" size={30} />
        <div
          style={{
            marginTop: 34,
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--taupe-on-ink)',
            textAlign: 'center',
          }}
        >
          The best path through hard terrain
        </div>
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 86 }}>
        <div style={{ height: 1, background: 'rgba(199,183,156,0.28)' }} />
        <div
          style={{
            height: 1,
            marginTop: -1,
            background: 'var(--accent-gold)',
            animation: 'nomad-route 1900ms ease-out forwards',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontWeight: 300,
          fontSize: 9,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--sage-600)',
        }}
      >
        Building a Better Africa
      </div>
    </div>
  );
}
