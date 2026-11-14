import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import { customer, appVersion } from '../data/mockData';
import { formatFullDate } from '../utils/format';
// customer.payoutAccounts stays mock (payments aren't wired up yet); everything
// else here comes from the authenticated user.
import { useAppState } from '../state/AppStateContext';
import { useKyc } from '../hooks/useKyc';
import { ActionLabel, BackTitle, Eyebrow, ItemMeta, ItemTitle, Screen } from '../components/ui';

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
        <ItemTitle>{title}</ItemTitle>
        {meta && <ItemMeta>{meta}</ItemMeta>}
      </div>
      {right}
    </div>
  );
}

const Arrow = <div style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>→</div>;

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, emailStatements, toggleEmailStatements, faceId, toggleFaceId, push, togglePush, lockApp, signOut } = useAppState();
  const { kyc } = useKyc();
  const [showDetails, setShowDetails] = useState(false);

  const bioFields = [
    ['Date of birth', user?.dateOfBirth ? formatFullDate(user.dateOfBirth) : null],
    ['Gender', user?.gender],
    ['Occupation', user?.occupation],
    ['National ID', user?.nationalId],
    ['Address', user?.address],
    ['Next of kin', user?.nextOfKinName && user?.nextOfKinPhone ? `${user.nextOfKinName} · ${user.nextOfKinPhone}` : user?.nextOfKinName],
  ].filter(([, value]) => value);

  return (
    <Screen>
      <BackTitle onBack={() => navigate('/home')}>
        PROFILE
      </BackTitle>

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
            {user?.initial}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 400, fontSize: 18, color: 'var(--text-heading)' }}>
            {user?.name} {user?.surname}
          </div>
          <ItemMeta>{user?.phoneMasked} · member since {user?.memberSince}</ItemMeta>
        </div>
      </div>

      {kyc && !kyc.complete && (
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
            Verification is at step {kyc.step} of {kyc.totalSteps}. Finish it to raise your limits.
          </div>
          <ActionLabel>OPEN</ActionLabel>
        </div>
      )}

      <Eyebrow top={26}>Your profile</Eyebrow>
      <SettingsCard>
        <SettingsRow
          title="Personal details"
          meta={bioFields.length ? `${bioFields.length} on file` : 'Not yet on file'}
          right={Arrow}
          onClick={() => setShowDetails((v) => !v)}
        />
        <SettingsRow title="Phone and email" meta={user?.email} right={Arrow} onClick={() => {}} />
        <SettingsRow title="Payout accounts" meta={customer.payoutAccounts} right={Arrow} onClick={() => {}} last />
      </SettingsCard>

      {showDetails && (
        <SettingsCard>
          {bioFields.length === 0 && (
            <div style={{ padding: '17px 20px', fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
              Nothing on file yet.
            </div>
          )}
          {bioFields.map(([label, value], i) => (
            <SettingsRow key={label} title={label} meta={value} last={i === bioFields.length - 1} />
          ))}
        </SettingsCard>
      )}

      <Eyebrow top={24}>Documents</Eyebrow>
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
          <ItemTitle>Statements and letters</ItemTitle>
          <ItemMeta>Statements, agreements, tax certificates</ItemMeta>
        </div>
        <ActionLabel>VIEW</ActionLabel>
      </div>

      <Eyebrow top={24}>Settings</Eyebrow>
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
          meta={user?.email}
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
          onClick={async () => {
            await lockApp();
            navigate('/login', { replace: true });
          }}
        >
          Lock the app
        </Button>
      </div>
      <div
        onClick={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
        style={{ marginTop: 14, textAlign: 'center', fontWeight: 500, fontSize: 10, letterSpacing: '0.18em', color: 'var(--accent-clay)', cursor: 'pointer' }}
      >
        SIGN OUT
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
        Building a Better Africa · {appVersion}
      </div>
    </Screen>
  );
}
