import { useState } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../api.js';
import { generatePassword, generatePin } from '../secrets.js';
import { Btn, Field, Notice, Page, Panel, Result, useAction } from '../ui.jsx';

const EMPTY = { username: '', name: '', surname: '', email: '', phoneMasked: '', liquidAccountName: 'Emergency' };

/** Onboards a member: their login, a liquid account at zero, KYC and settings at the defaults. */
export default function AddMember() {
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState(null);
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const password = generatePassword();
    const pin = generatePin();
    const r = await action.run(() => admin('create-user', { method: 'POST', body: { ...form, username: form.username.trim().toLowerCase(), password, pin } }));
    if (r) {
      setCreated({ username: r.user.username, password, pin, name: `${form.name} ${form.surname}` });
      setForm(EMPTY);
    }
  };

  return (
    <Page title="Add member" subtitle="Creates their login and a liquid account starting at zero. Bio-data and holdings can be added on their page afterwards.">
      {created && (
        <Panel title="Login for the new member">
          <Notice tone="warning">Shown once. Share it with {created.name} privately — it isn't stored anywhere you can read it back.</Notice>
          <dl className="dl" style={{ marginTop: 14 }}>
            <dt>Username</dt>
            <dd className="secret">{created.username}</dd>
            <dt>Password</dt>
            <dd className="secret">{created.password}</dd>
            <dt>PIN</dt>
            <dd className="secret">{created.pin}</dd>
          </dl>
          <p>
            <Link to={`/members/${created.username}`}>Open {created.name}'s page →</Link>
          </p>
        </Panel>
      )}
      <Panel title="Details">
        <form className="form" onSubmit={submit}>
          <Field label="First name(s)">
            <input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Surname">
            <input value={form.surname} onChange={set('surname')} required />
          </Field>
          <Field label="Username" hint="Lowercase, how they'll sign in">
            <input value={form.username} onChange={set('username')} pattern="[A-Za-z0-9._\-]+" required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Phone (as shown in the app)" hint="Masked, e.g. 0772 ••• 123">
            <input value={form.phoneMasked} onChange={set('phoneMasked')} required />
          </Field>
          <Field label="Liquid account name">
            <input value={form.liquidAccountName} onChange={set('liquidAccountName')} required />
          </Field>
          <div className="form-actions">
            <Result action={action} />
            <Btn type="submit" disabled={action.busy}>
              {action.busy ? 'Creating…' : 'Create member'}
            </Btn>
          </div>
        </form>
      </Panel>
    </Page>
  );
}
