import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import { customer, appVersion } from '../data/mockData';
import { useAppState } from '../state/AppStateContext';

function SectionLabel({ children, style = {} }) {
  return (
    <div style={{ fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', ...style }}>
      {children}
    </div>
  );
}

function SettingsCard({ children }) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function SettingsRow({ title, meta, right, onClick, last = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '17px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        borderBottom: last ? 'none' : '1px solid var(--border-default)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>{title}</div>
        {meta && <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>{meta}</div>}
      </div>
      {right}
    </div>
  );
}

const Arrow = <div style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>→</div>;

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { emailStatements, toggleEmailStatements, faceId, toggleFaceId, push, togglePush, logout } = useAppState();
  const initial = customer.name.trim().charAt(0).toUpperCase();

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>←</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          PROFILE
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            flex: 'none',
            background: 'var(--surface-ink)',
            border: '1px solid rgba(201,138,43,0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, letterSpacing: '0.04em', color: 'var(--accent-gold)' }}>
            {initial}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 400, fontSize: 18, color: 'var(--text-heading)' }}>
            {customer.name} {customer.surname}
          </div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
            {customer.phoneMasked} · member since {customer.memberSince}
          </div>
        </div>
      </div>

      <div
        onClick={() => navigate('/kyc')}
        style={{
          marginTop: 18,
          border: '1px solid var(--accent-gold)',
          borderRadius: 6,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-body)', flex: 1 }}>
          Verification is at step 3 of 4. Finish it to raise your limits.
        </div>
        <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>OPEN</div>
      </div>

      <SectionLabel style={{ marginTop: 26 }}>Your profile</SectionLabel>
      <SettingsCard>
        <SettingsRow title="Personal details" meta="Name, date of birth, address" right={Arrow} onClick={() => {}} />
        <SettingsRow title="Phone and email" meta={customer.email} right={Arrow} onClick={() => {}} />
        <SettingsRow title="Payout accounts" meta={customer.payoutAccounts} right={Arrow} onClick={() => {}} last />
      </SettingsCard>

      <SectionLabel style={{ marginTop: 24 }}>Documents</SectionLabel>
      <div
        onClick={() => navigate('/statements')}
        style={{
          marginTop: 12,
          background: 'var(--surface-panel)',
          borderRadius: 8,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Statements and letters</div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>
            Statements, agreements, tax certificates
          </div>
        </div>
        <div style={{ fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--ink-green)' }}>VIEW</div>
      </div>

      <SectionLabel style={{ marginTop: 24 }}>Settings</SectionLabel>
      <SettingsCard>
        <SettingsRow
          title="Face ID unlock"
          meta="Instead of your four-digit PIN"
          right={<Toggle on={faceId} onClick={toggleFaceId} />}
        />
        <SettingsRow
          title="Push notifications"
          meta="Repayments, interest, fund notices"
          right={<Toggle on={push} onClick={togglePush} />}
        />
        <SettingsRow
          title="Monthly statements by email"
          meta={customer.email}
          right={<Toggle on={emailStatements} onClick={toggleEmailStatements} />}
        />
        <SettingsRow title="Change PIN" right={Arrow} onClick={() => {}} />
        <SettingsRow
          title="Language"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>English</span>
              <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>→</span>
            </div>
          }
          onClick={() => {}}
          last
        />
      </SettingsCard>

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
      <div style={{ marginTop: 16, textAlign: 'center', fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
        Nomad Ventures LLP · Nairobi · {appVersion}
      </div>
    </div>
  );
}
