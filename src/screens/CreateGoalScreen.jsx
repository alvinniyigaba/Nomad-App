import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import Toggle from '../components/ds/Toggle';
import { Loading } from '../components/ScreenState';
import { useAccounts } from '../hooks/useAccounts';

function inputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    padding: '14px 16px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 400,
    fontSize: 14,
    color: 'var(--text-heading)',
    outline: 'none',
  };
}

function label(text) {
  return (
    <div style={{ marginTop: 22, marginBottom: 8, fontWeight: 300, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      {text}
    </div>
  );
}

export default function CreateGoalScreen() {
  const navigate = useNavigate();
  const { refetch } = useAccounts();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [invited, setInvited] = useState({}); // { username: 'admin' | 'member' | undefined }
  const [users, setUsers] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, []);

  function toggleInvite(username) {
    setInvited((prev) => {
      const next = { ...prev };
      if (next[username]) delete next[username];
      else next[username] = 'member';
      return next;
    });
  }

  function setRole(username, role) {
    setInvited((prev) => ({ ...prev, [username]: role }));
  }

  const canSubmit = name.trim() && Number(target) > 0 && targetDate && !submitting;

  async function submit() {
    setSubmitting(true);
    setError('');
    const members = Object.entries(invited).map(([username, role]) => ({ username, role }));
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        targetMinor: Math.round(Number(target) * 100),
        targetDate,
        members: isGroup ? members : [],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not create the goal');
      setSubmitting(false);
      return;
    }
    await refetch();
    navigate('/save');
  }

  if (users === null) return <Loading />;

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div onClick={() => navigate('/save')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ fontWeight: 300, fontSize: 19, color: 'var(--text-muted)', lineHeight: 1 }}>✕</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, letterSpacing: '0.14em', color: 'var(--text-heading)' }}>
          NEW GOAL
        </div>
      </div>

      {label('Goal name')}
      <input style={inputStyle()} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shamba fund" />

      {label('Target amount (UGX)')}
      <input style={inputStyle()} type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />

      {label('Target date')}
      <input style={inputStyle()} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '17px 20px' }}>
        <div>
          <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Make this a group goal</div>
          <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: 'var(--text-muted)' }}>Invite others to save toward it with you</div>
        </div>
        <Toggle on={isGroup} onClick={() => setIsGroup((v) => !v)} />
      </div>

      {isGroup && (
        <>
          {label('Invite members')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.length === 0 && (
              <div style={{ fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>No other pilot users to invite yet.</div>
            )}
            {users.map((u) => {
              const role = invited[u];
              return (
                <div key={u} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)', textTransform: 'capitalize' }}>{u}</div>
                    <Toggle on={!!role} onClick={() => toggleInvite(u)} />
                  </div>
                  {role && (
                    <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                      {['member', 'admin'].map((r) => (
                        <div
                          key={r}
                          onClick={() => setRole(u, r)}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '9px 0',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 10,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            border: '1px solid ' + (role === r ? 'var(--ink-green)' : 'var(--border-default)'),
                            background: role === r ? 'var(--ink-green)' : 'transparent',
                            color: role === r ? 'var(--bone)' : 'var(--text-muted)',
                          }}
                        >
                          {r === 'admin' ? 'Admin (can withdraw)' : 'Member'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && <div style={{ marginTop: 16, fontWeight: 400, fontSize: 12, color: 'var(--accent-clay)' }}>{error}</div>}

      <div style={{ marginTop: 24 }}>
        <Button variant="primary" size="lg" full onClick={submit} disabled={!canSubmit}>
          {submitting ? 'Creating…' : 'Create goal'}
        </Button>
      </div>
    </div>
  );
}
