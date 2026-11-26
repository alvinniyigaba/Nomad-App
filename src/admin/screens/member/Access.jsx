import { useState } from 'react';
import { admin } from '../../api.js';
import { dateTime } from '../../money.js';
import { generatePassword, generatePin } from '../../secrets.js';
import { Badge, Btn, Empty, Notice, Panel, Result, useAction } from '../../ui.jsx';

const KYC_STEPS = [
  ['phone_verified', 'Phone verified'],
  ['id_matched', 'ID matched'],
  ['selfie_done', 'Selfie'],
  ['source_of_funds_done', 'Source of funds'],
];

export default function Access({ data, username, reload }) {
  const [issued, setIssued] = useState(null);
  const reset = useAction();
  const revoke = useAction();
  const l = data.logins;

  const resetLogin = async () => {
    if (!window.confirm(`Give ${username} a new password and PIN? They'll be signed out on every device and their old login stops working.`)) return;
    const password = generatePassword();
    const pin = generatePin();
    const r = await reset.run(() => admin('reset-credentials', { method: 'POST', body: { username, password, pin } }));
    if (r) {
      setIssued({ password, pin });
      reload();
    }
  };

  const revokeDevice = async (d) => {
    if (!window.confirm(`Unlink “${d.label || 'phone'}”? It stops syncing with Nomad Money.`)) return;
    const r = await revoke.run(() => admin('money-device', { method: 'DELETE', body: { id: d.id } }));
    if (r) reload();
  };

  return (
    <>
      <div className="grid-2">
        <Panel title="Sign-ins">
          <dl className="dl">
            <dt>Sign-ins</dt>
            <dd>
              {l.login_count} ({l.full_sessions} got past the PIN)
            </dd>
            <dt>First</dt>
            <dd>{dateTime(l.first_login)}</dd>
            <dt>Latest</dt>
            <dd>{dateTime(l.last_login)}</dd>
            <dt>Signed in now on</dt>
            <dd>
              {l.active_sessions} device{l.active_sessions === 1 ? '' : 's'}
            </dd>
          </dl>
        </Panel>
        <Panel title="KYC">
          {data.kyc ? (
            <dl className="dl">
              {KYC_STEPS.map(([k, label]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{data.kyc[k] ? <Badge tone="success">Done</Badge> : <Badge tone="gold">Outstanding</Badge>}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>No KYC record.</Empty>
          )}
        </Panel>
      </div>

      <Panel
        title="Login"
        actions={
          <Btn size="sm" variant="danger" onClick={resetLogin} disabled={reset.busy}>
            {reset.busy ? 'Resetting…' : 'Issue new password & PIN'}
          </Btn>
        }
      >
        {issued ? (
          <>
            <Notice tone="warning">Shown once. Share it with the member privately; they've been signed out everywhere.</Notice>
            <dl className="dl" style={{ marginTop: 14 }}>
              <dt>Username</dt>
              <dd className="secret">{username}</dd>
              <dt>Password</dt>
              <dd className="secret">{issued.password}</dd>
              <dt>PIN</dt>
              <dd className="secret">{issued.pin}</dd>
            </dl>
          </>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            For a forgotten password or PIN. New ones are generated in this browser; the server keeps only a hash.
          </p>
        )}
        <Result action={reset} />
      </Panel>

      <Panel title="Nomad Money phones" flush>
        <Result action={revoke} />
        {data.devices.length === 0 ? (
          <Empty>No phone linked. Link one with scripts/link-money-device.sh.</Empty>
        ) : (
          <table className="data">
            <tbody>
              {data.devices.map((d) => (
                <tr key={d.id} className={d.revoked_at ? 'dim' : ''}>
                  <td className="cell-title">{d.label || 'Phone'}</td>
                  <td className="muted">linked {dateTime(d.created_at)}</td>
                  <td className="muted">{d.revoked_at ? `unlinked ${dateTime(d.revoked_at)}` : `last seen ${dateTime(d.last_seen_at)}`}</td>
                  <td className="num">
                    {!d.revoked_at && (
                      <Btn size="sm" variant="danger" onClick={() => revokeDevice(d)}>
                        Unlink
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
