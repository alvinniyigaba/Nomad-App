import { Fragment, useState } from 'react';
import { admin } from '../../api.js';
import { dateTime, day, isoDate, todayKampala, toMajorText, toMinor, ugx } from '../../money.js';
import { Badge, Btn, Empty, Field, Modal, Notice, Panel, Result, Signed, useAction } from '../../ui.jsx';

function progress(a) {
  if (!a.targetMinor || BigInt(a.targetMinor) <= 0n) return null;
  return Math.min(100, Number((BigInt(a.balanceMinor) * 100n) / BigInt(a.targetMinor)));
}

/**
 * Posts one deposit or withdrawal through resource=post-entries, the same
 * path the sheet sync uses. The key is new per submission, so a double
 * click inside the same open form can't post twice.
 */
function RecordEntry({ account, username, onClose, onSaved }) {
  const [key] = useState(() => `console-${crypto.randomUUID()}`);
  const [form, setForm] = useState({ type: 'deposit', amount: '', date: todayKampala(), memo: '' });
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const minor = toMinor(form.amount);

  const submit = async (e) => {
    e.preventDefault();
    const r = await action.run(async () => {
      const res = await admin('post-entries', {
        method: 'POST',
        body: {
          entries: [
            {
              idempotencyKey: key,
              date: form.date,
              owner: account.isGroup ? '' : username,
              accountName: account.name,
              contributor: username,
              type: form.type,
              amountStr: String(minor / 100),
              memo: form.memo,
            },
          ],
        },
      });
      if (res.errors?.length) throw new Error(res.errors[0].error);
      return res;
    });
    if (r) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal title={`Record an entry — ${account.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Type">
          <select value={form.type} onChange={set('type')}>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </Field>
        <Field label="Amount (UGX)">
          <input inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="e.g. 250,000" required />
        </Field>
        <Field label="Date" hint="When the money actually moved">
          <input type="date" value={form.date} onChange={set('date')} max={todayKampala()} required />
        </Field>
        <Field label="Memo" hint="Shown to the member">
          <input value={form.memo} onChange={set('memo')} placeholder={form.type === 'deposit' ? 'Deposit' : 'Withdrawal'} />
        </Field>
        {account.isGroup && (
          <Notice tone="info">
            Posted to the group goal as {username}'s {form.type}.
          </Notice>
        )}
        <div className="form-actions">
          <Result action={action} />
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={action.busy || !(minor > 0)}>
            {action.busy ? 'Posting…' : minor > 0 ? `Post ${form.type === 'withdrawal' ? '−' : '+'}${ugx(minor)}` : 'Post'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function EditAccount({ account, onClose, onSaved }) {
  const [form, setForm] = useState({ name: account.name, target: toMajorText(account.targetMinor), targetDate: isoDate(account.targetDate) });
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const body = { id: account.id };
    if (form.name.trim() !== account.name) body.name = form.name.trim();
    const target = toMinor(form.target);
    if (form.target && target !== Number(account.targetMinor ?? NaN)) body.targetMinor = target;
    if (form.targetDate && form.targetDate !== isoDate(account.targetDate)) body.targetDate = form.targetDate;
    if (Object.keys(body).length === 1) return onClose();
    const r = await action.run(() => admin('update-account', { method: 'PATCH', body }));
    if (r) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal title={`Edit ${account.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name" wide>
          <input value={form.name} onChange={set('name')} required />
        </Field>
        {account.kind === 'goal' && (
          <>
            <Field label="Target (UGX)">
              <input inputMode="decimal" value={form.target} onChange={set('target')} />
            </Field>
            <Field label="Target date">
              <input type="date" value={form.targetDate} onChange={set('targetDate')} />
            </Field>
          </>
        )}
        <div className="form-actions">
          <Result action={action} />
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={action.busy}>
            Save
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export default function Accounts({ data, username, reload }) {
  const [open, setOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const action = useAction();

  const toggleClosed = async (account) => {
    const closing = !account.closedAt;
    if (closing && !window.confirm(`Close ${account.name}? It disappears from the member's app; its history is kept and it can be reopened.`)) return;
    const r = await action.run(() => admin('update-account', { method: 'PATCH', body: { id: account.id, closed: closing } }));
    if (r) reload();
  };

  return (
    <Panel title="Savings accounts" flush>
      {action.error && (
        <div style={{ padding: '12px 18px 0' }}>
          <Result action={action} />
        </div>
      )}
      {data.accounts.length === 0 ? (
        <Empty>No accounts.</Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Account</th>
              <th className="num">Balance</th>
              <th>Target</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((a) => {
              const pct = progress(a);
              return (
                <Fragment key={a.id}>
                  <tr className={a.closedAt ? 'dim' : ''}>
                    <td>
                      <div className="cell-title">
                        {a.name} {a.kind === 'liquid' && <Badge>Liquid</Badge>} {a.isGroup && <Badge tone="gold">Group</Badge>} {a.closedAt && <Badge>Closed</Badge>}
                      </div>
                      <div className="cell-sub">
                        {a.isGroup ? `${a.members.length} members · their share ${ugx(a.myShareMinor)}` : `Opened ${day(a.createdAt)}`}
                      </div>
                    </td>
                    <td className="num cell-title">{ugx(a.balanceMinor)}</td>
                    <td>
                      {pct == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <>
                          <div className="small">
                            {pct}% of {ugx(a.targetMinor)}
                            {a.targetDate ? ` by ${day(a.targetDate)}` : ''}
                          </div>
                          <div className="progress">
                            <div style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {!a.closedAt && (
                          <Btn size="sm" onClick={() => setModal({ kind: 'entry', account: a })}>
                            Record entry
                          </Btn>
                        )}
                        {!a.isGroup && (
                          <Btn size="sm" variant="outline" onClick={() => setModal({ kind: 'edit', account: a })}>
                            Edit
                          </Btn>
                        )}
                        {!a.isGroup && (a.closedAt || BigInt(a.balanceMinor) === 0n) && (
                          <Btn size="sm" variant={a.closedAt ? 'outline' : 'danger'} disabled={action.busy} onClick={() => toggleClosed(a)}>
                            {a.closedAt ? 'Reopen' : 'Close'}
                          </Btn>
                        )}
                        <Btn size="sm" variant="outline" onClick={() => setOpen(open === a.id ? null : a.id)}>
                          {open === a.id ? 'Hide' : 'Entries'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                  {open === a.id && (
                    <tr>
                      <td colSpan={4} style={{ background: 'var(--surface-ground)' }}>
                        {a.isGroup && (
                          <p className="small" style={{ marginTop: 0 }}>
                            Members: {a.members.map((m) => `${m.username} (${m.role}, ${ugx(m.contributionMinor)})`).join(' · ')}
                          </p>
                        )}
                        {a.entries.length === 0 ? (
                          <span className="muted small">No entries yet.</span>
                        ) : (
                          <table className="data">
                            <tbody>
                              {a.entries.map((e) => (
                                <tr key={e.id}>
                                  <td className="muted">{dateTime(e.createdAt)}</td>
                                  <td>
                                    {e.memo || e.kind} <span className="muted small">· {e.kind}{a.isGroup ? ` · ${e.username}` : ''}</span>
                                  </td>
                                  <td className="num">
                                    <Signed minor={e.amountMinor}>{ugx(e.amountMinor, { signed: true })}</Signed>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {a.entries.length === 10 && <div className="muted small" style={{ marginTop: 6 }}>Latest 10 shown.</div>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      {modal?.kind === 'entry' && <RecordEntry account={modal.account} username={username} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.kind === 'edit' && <EditAccount account={modal.account} onClose={() => setModal(null)} onSaved={reload} />}
    </Panel>
  );
}
