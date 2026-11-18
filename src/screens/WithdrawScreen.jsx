import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { withdrawDestinations } from '../data/mockData';
import { fmt, ksh, fromMinor } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import { useAppState } from '../state/AppStateContext';
import { useAccounts } from '../hooks/useAccounts';
import { BackTitle, Eyebrow, ItemMeta, ItemTitle, Screen, Stack } from '../components/ui';

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

export default function WithdrawScreen() {
  const navigate = useNavigate();
  const { wd, setWd, dest, setDest } = useAppState();
  const { status, goal, liquid, groupGoals, error, refetch } = useAccounts();
  const money = useMoney();
  const [accountId, setAccountId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const adminGroupGoals = groupGoals.filter((g) => g.myRole === 'admin');
  const sources = [liquid, ...adminGroupGoals].filter(Boolean);

  useEffect(() => {
    // No liquid fund (it can be closed when empty): start on the first group goal they can withdraw from.
    if (status === 'ready' && !accountId && (liquid ?? sources[0])) setAccountId((liquid ?? sources[0]).id);
  }, [status, liquid, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const account = sources.find((a) => a.id === accountId) ?? liquid;
  const available = account ? fromMinor(account.balanceMinor) - fromMinor(account.pledgedMinor) : 0;
  const presets = [10000, 45000].filter((p) => p < available);

  useEffect(() => {
    if (status === 'ready' && wd > available) setWd(Math.min(10000, available));
  }, [status, available]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const destination = withdrawDestinations.find((d) => d.id === dest);
  const fee = destination.fee;
  const receive = Math.max(0, wd - fee);

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        amountMinor: Math.round(wd * 100),
        rail: destination.label,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? 'Withdrawal failed');
      setSubmitting(false);
      return;
    }
    navigate('/home');
  }

  return (
    <Screen>
      <BackTitle onBack={() => navigate('/home')} close>
        WITHDRAW
      </BackTitle>

      <Eyebrow top={24}>From</Eyebrow>
      <Stack top={10}>
        {sources.map((a) => (
          <div
            key={a.id}
            onClick={() => setAccountId(a.id)}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid ' + (accountId === a.id ? 'var(--ink-green)' : 'var(--border-default)'),
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
              <ItemTitle>
                {a.name}
                {a.isGroup ? ' (group)' : ''}
              </ItemTitle>
              <ItemMeta>{money.ksh(fromMinor(a.balanceMinor) - fromMinor(a.pledgedMinor))} available</ItemMeta>
            </div>
          </div>
        ))}
      </Stack>
      {goal && Number(goal.pledgedMinor) > 0 && (
        <div style={{ marginTop: 10, fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
          {goal.name} is unavailable — {money.ksh(fromMinor(goal.pledgedMinor))} is pledged against your loan.
        </div>
      )}

      <Eyebrow top={26}>Amount</Eyebrow>
      <div style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1.5px solid var(--ink-green)', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>UGX</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 30, letterSpacing: '0.03em', color: 'var(--text-heading)' }}>{fmt(wd)}</span>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
        {presets.map((amt) => (
          <div key={amt} onClick={() => setWd(amt)} style={chipStyle(wd === amt)}>
            {fmt(amt)}
          </div>
        ))}
        <div onClick={() => setWd(available)} style={chipStyle(wd === available)}>
          ALL
        </div>
      </div>

      <Eyebrow top={26}>To</Eyebrow>
      <Stack>
        {withdrawDestinations.map((d) => (
          <div
            key={d.id}
            onClick={() => setDest(d.id)}
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
              <ItemTitle>{d.label}</ItemTitle>
              <ItemMeta>{d.meta}</ItemMeta>
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
              <div style={{ width: 10, height: 10, borderRadius: 6, background: dest === d.id ? 'var(--ink-green)' : 'transparent' }} />
            </div>
          </div>
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
        <span style={{ fontWeight: 300, fontSize: 13, color: 'var(--text-body)' }}>You receive</span>
        <span style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-heading)' }}>{ksh(receive)}</span>
      </div>
      {submitError && (
        <div style={{ marginTop: 12, fontWeight: 400, fontSize: 12, color: 'var(--accent-clay)' }}>{submitError}</div>
      )}
      <div style={{ marginTop: 20 }}>
        <Button variant="primary" size="lg" full onClick={submit} disabled={submitting || wd <= 0}>
          {submitting ? 'Withdrawing…' : `Withdraw ${ksh(wd)}`}
        </Button>
      </div>
    </Screen>
  );
}
