import { useState } from 'react';
import { admin } from '../../api.js';
import { isoDate } from '../../money.js';
import { Btn, Field, Notice, Panel, Result, useAction } from '../../ui.jsx';

const FIELDS = [
  ['dateOfBirth', 'Date of birth', 'date'],
  ['gender', 'Gender', 'text'],
  ['occupation', 'Occupation', 'text'],
  ['nationalId', 'National ID', 'text'],
  ['address', 'Address', 'text'],
  ['nextOfKinName', 'Next of kin', 'text'],
  ['nextOfKinPhone', 'Next of kin phone', 'tel'],
];

function initial(p) {
  return Object.fromEntries(FIELDS.map(([k, , type]) => [k, type === 'date' ? isoDate(p[k]) : (p[k] ?? '')]));
}

/** Bio-data, admin-entered as members disclose it. Only changed fields are sent. */
export default function Profile({ data, username, reload }) {
  const p = data.profile;
  const [form, setForm] = useState(() => initial(p));
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const original = initial(p);
  const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v.trim() !== String(original[k]).trim() && v.trim() !== ''));

  const submit = async (e) => {
    e.preventDefault();
    const r = await action.run(() => admin('user-profile', { method: 'PATCH', body: { username, ...Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.trim()])) } }));
    if (r) reload();
  };

  return (
    <div className="grid-2">
      <Panel title="Bio-data">
        <form className="form" onSubmit={submit}>
          {FIELDS.map(([k, label, type]) => (
            <Field key={k} label={label}>
              <input type={type} value={form[k]} onChange={set(k)} />
            </Field>
          ))}
          <div className="form-actions">
            <Result action={action} success="Saved." />
            <Btn type="submit" disabled={action.busy || Object.keys(changed).length === 0}>
              Save changes
            </Btn>
          </div>
        </form>
        <Notice tone="info">A field can be corrected but not emptied from here.</Notice>
      </Panel>
      <Panel title="Account">
        <dl className="dl">
          <dt>Username</dt>
          <dd>@{p.username}</dd>
          <dt>Email</dt>
          <dd>{p.email}</dd>
          <dt>Phone</dt>
          <dd>{p.phoneMasked}</dd>
          <dt>Member since</dt>
          <dd>{p.memberSince}</dd>
        </dl>
      </Panel>
    </div>
  );
}
