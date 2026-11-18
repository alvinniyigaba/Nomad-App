import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { withdrawDestinations as rails } from '../data/mockData';
import { fmt, ksh, fromMinor } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import { useAccounts } from '../hooks/useAccounts';
import { BackTitle, Eyebrow, ItemMeta, ItemTitle, Screen, Stack } from '../components/ui';

const PRESETS = [5000, 20000, 50000];

function chipStyle(active) {
  return {
    flex: 1,
    textAlign: 'center',
    padding: '12px 0',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 10,
    letterSpacing: '0.14em',
    border: '1px solid ' + (active ? 'var(--ink-green)' : 'var(--border-default)'),
    background: active ? 'var(--ink-green)' : 'transparent',
    color: active ? 'var(--bone)' : 'var(--text-muted)',
  };
}

function RadioRow({ title, meta, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '17px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <div>
        <ItemTitle>{title}</ItemTitle>
        <ItemMeta>{meta}</ItemMeta>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 11,
          flex: 'none',
          border: '1.5px solid var(--sand-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 6, background: selected ? 'var(--ink-green)' : 'transparent' }} />
      </div>
    </div>
  );
}

export default function DepositScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, goal, liquid, groupGoals, accounts, error, refetch } = useAccounts();
  const money = useMoney();
  const [accountId, setAccountId] = useState(null);
  const [amount, setAmount] = useState(PRESETS[0]);
  const [rail, setRail] = useState(rails[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (status !== 'ready' || accountId) return;
    const preferred = searchParams.get('account');
    if (preferred === 'liquid' && liquid) setAccountId(liquid.id);
    else if (preferred && accounts.find((a) => a.id === preferred)) setAccountId(preferred);
    else if (goal) setAccountId(goal.id);
    else if (liquid) setAccountId(liquid.id);
    else if (accounts[0]) setAccountId(accounts[0].id);
  }, [status, goal, liquid, accounts, searchParams, accountId]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const destination = rails.find((r) => r.id === rail);

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    const res = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        amountMinor: Math.round(amount * 100),
        rail: destination.label,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? 'Deposit failed');
      setSubmitting(false);
      return;
    }
    navigate('/home');
  }

  return (
    <Screen>
      <BackTitle onBack={() => navigate('/home')} close>
        ADD MONEY
      </BackTitle>

      <Eyebrow top={24}>To</Eyebrow>
      <Stack top={10}>
        {goal && (
          <RadioRow
            title={goal.name}
            meta={`${money.ksh(fromMinor(goal.balanceMinor))} saved`}
            selected={accountId === goal.id}
            onClick={() => setAccountId(goal.id)}
          />
        )}
        {liquid && (
          <RadioRow
            title={liquid.name}
            meta={`${money.ksh(fromMinor(liquid.balanceMinor))} saved`}
            selected={accountId === liquid.id}
            onClick={() => setAccountId(liquid.id)}
          />
        )}
        {groupGoals.map((g) => (
          <RadioRow
            key={g.id}
            title={`${g.name} (group)`}
            meta={`${money.ksh(fromMinor(g.balanceMinor))} saved`}
            selected={accountId === g.id}
            onClick={() => setAccountId(g.id)}
          />
        ))}
      </Stack>

      <Eyebrow top={26}>Amount</Eyebrow>
      <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1.5px solid var(--ink-green)', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>UGX</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 30, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>{fmt(amount)}</span>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {PRESETS.map((amt) => (
          <div key={amt} onClick={() => setAmount(amt)} style={chipStyle(amount === amt)}>
            {fmt(amt)}
          </div>
        ))}
      </div>

      <Eyebrow top={26}>From</Eyebrow>
      <Stack>
        {rails.map((r) => (
          <RadioRow key={r.id} title={r.label} meta={r.meta} selected={rail === r.id} onClick={() => setRail(r.id)} />
        ))}
      </Stack>

      <div
        style={{
          marginTop: 20,
          background: 'var(--surface-panel)',
          borderRadius: 8,
          padding: '17px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>You add</span>
        <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(amount)}</span>
      </div>
      {submitError && (
        <div style={{ marginTop: 12, fontWeight: 400, fontSize: 12, color: 'var(--accent-clay)' }}>{submitError}</div>
      )}
      <div style={{ marginTop: 20 }}>
        <Button variant="primary" size="lg" full onClick={submit} disabled={submitting || !accountId}>
          {submitting ? 'Adding…' : `Add ${ksh(amount)}`}
        </Button>
      </div>
    </Screen>
  );
}
