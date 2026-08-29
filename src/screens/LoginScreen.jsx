import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NomadLogo from '../components/ds/NomadLogo';
import TerrainPattern from '../components/ds/TerrainPattern';
import { customer } from '../data/mockData';
import { useAppState } from '../state/AppStateContext';

const DIGIT_STYLE = {
  font: 'var(--font-display)',
  weight: 500,
  size: '22px',
  ls: '0.04em',
  color: 'var(--text-on-ink)',
  bg: 'rgba(245,238,226,0.06)',
  border: 'rgba(201,138,43,0.24)',
};
const ACTION_STYLE = {
  font: 'var(--font-sans)',
  weight: 500,
  size: '10px',
  ls: '0.18em',
  color: 'var(--taupe-on-ink)',
  bg: 'transparent',
  border: 'transparent',
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'face', '0', 'del'];

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();
  const { login } = useAppState();
  const unlockTimer = useRef(null);

  function unlock(delay) {
    unlockTimer.current = setTimeout(() => {
      login();
      navigate('/home', { replace: true });
    }, delay);
  }

  function pressDigit(d) {
    return () => {
      const next = (pin + d).slice(0, 4);
      setPin(next);
      if (next.length === 4) unlock(340);
    };
  }
  function pressDelete() {
    setPin((p) => p.slice(0, -1));
  }
  function pressFaceId() {
    setPin('1234');
    unlock(420);
  }

  const pinMask = '•'.repeat(pin.length);
  const pinFill = (pin.length / 4) * 100 + '%';
  const pinNote = pin.length === 4 ? 'Unlocking' : 4 - pin.length + ' digits left';
  const pinNoteColor = pin.length === 4 ? 'var(--accent-gold)' : 'var(--taupe-on-ink)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--surface-ink)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <TerrainPattern theme="ink" width={480} height={960} showRoute={false} contourOpacity={0.09} />
      </div>
      <div
        className="nomad-scroll"
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          overflowY: 'auto',
          padding: '64px 26px 30px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NomadLogo brand="group" layout="horizontal" theme="ink" size={13} />

        <div style={{ marginTop: 36, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 21, letterSpacing: '0.05em', color: 'var(--text-on-ink)' }}>
          WELCOME BACK
        </div>
        <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: 'var(--text-on-ink-body)' }}>
          Enter your four-digit PIN, {customer.name}. The number on this device is {customer.phoneMasked}.
        </div>

        <div style={{ marginTop: 38 }}>
          <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--taupe-on-ink)' }}>PIN</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 3, minHeight: 34 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 26, letterSpacing: '0.42em', color: 'var(--text-on-ink)', lineHeight: 1 }}>
              {pinMask}
            </div>
            <div style={{ width: 1.5, height: 24, background: 'var(--accent-gold)', animation: 'nomad-caret 1s steps(1,end) infinite' }} />
          </div>
          <div style={{ marginTop: 12, height: 1, background: 'rgba(199,183,156,0.3)' }}>
            <div style={{ height: 1, background: 'var(--accent-gold)', width: pinFill, transition: 'width 180ms ease-out' }} />
          </div>
          <div style={{ marginTop: 11, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: pinNoteColor }}>{pinNote}</div>
            <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--taupe-on-ink)', cursor: 'pointer' }}>FORGOT PIN</div>
          </div>
        </div>

        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
          {KEYS.map((k) => {
            const isFace = k === 'face';
            const isDel = k === 'del';
            const style = isFace || isDel ? ACTION_STYLE : DIGIT_STYLE;
            const label = isFace ? 'FACE ID' : isDel ? 'DELETE' : k;
            const onClick = isFace ? pressFaceId : isDel ? pressDelete : pressDigit(k);
            return (
              <div
                key={k}
                onClick={onClick}
                style={{
                  minHeight: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 6,
                  fontFamily: style.font,
                  fontWeight: style.weight,
                  fontSize: style.size,
                  letterSpacing: style.ls,
                  color: style.color,
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />
        <div style={{ textAlign: 'center', fontWeight: 300, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--sage-600)' }}>
          Nomad Ventures LLP · Nairobi
        </div>
      </div>
    </div>
  );
}
