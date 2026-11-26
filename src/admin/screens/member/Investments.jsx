import { Fragment, useState } from 'react';
import { admin } from '../../api.js';
import { day, isoDate, pctFromBps, todayKampala, toMajorText, toMinor, ugx } from '../../money.js';
import { Badge, Btn, Empty, Field, Modal, Notice, Panel, Result, useAction } from '../../ui.jsx';

const PRODUCT_TYPES = { investment: 'Investment', savings: 'Savings', fixed_deposit: 'Fixed deposit', other: 'Other' };

/** Records today's (or any date's) value: a dated snapshot for a Nomad holding, the plain balance for an external one. */
function RecordValue({ holding, onClose, onSaved }) {
  const nomad = holding.managedBy === 'nomad';
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayKampala());
  const action = useAction();
  const minor = toMinor(value);

  const submit = async (e) => {
    e.preventDefault();
    const body = nomad ? { id: holding.id, snapshotDate: date, snapshotValueMinor: minor } : { id: holding.id, balanceMinor: minor };
    const r = await action.run(() => admin('external-holdings', { method: 'PATCH', body }));
    if (r) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal title={`Record value — ${holding.providerName}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Value (UGX)" hint={`Currently ${ugx(holding.valueMinor)}${holding.valueDate ? ` (${day(holding.valueDate)})` : ''}`}>
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus required />
        </Field>
        {nomad ? (
          <Field label="As of" hint="Re-posting a date corrects that day's value">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayKampala()} required />
          </Field>
        ) : (
          <Notice tone="info">External holdings keep one current value, no history.</Notice>
        )}
        <div className="form-actions">
          <Result action={action} />
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={action.busy || !(minor >= 0) || value === ''}>
            Save value
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function holdingToForm(h) {
  return {
    providerName: h?.providerName ?? '',
    productType: h?.productType ?? 'investment',
    managedBy: h?.managedBy ?? 'external',
    status: h?.status ?? 'active',
    currency: h?.currency ?? '',
    startDate: isoDate(h?.startDate),
    invested: toMajorText(h?.investedMinor),
    rate: h?.interestRateBps != null ? String(h.interestRateBps / 100) : '',
    sector: h?.sector ?? '',
    notes: h?.notes ?? '',
    value: '',
  };
}

/**
 * Adds a holding, or edits one. Blank fields are left as they are — the
 * API keeps a field's value unless it's given a new one. Members whose
 * sheet is synced daily get rate, notes, start date and invested amount
 * refreshed from the sheet, so change those in the sheet instead.
 */
function HoldingForm({ username, holding, onClose, onSaved }) {
  const editing = !!holding;
  const [form, setForm] = useState(() => holdingToForm(holding));
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const fields = {
      providerName: form.providerName.trim(),
      productType: form.productType,
      managedBy: form.managedBy,
      status: form.status,
      investmentCurrency: form.currency.trim().toUpperCase() || undefined,
      startDate: form.startDate || undefined,
      investedMinor: form.invested ? toMinor(form.invested) : undefined,
      interestRateBps: form.rate ? Math.round(Number(form.rate) * 100) : undefined,
      sector: form.sector.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    const r = await action.run(async () => {
      if (editing) return admin('external-holdings', { method: 'PATCH', body: { id: holding.id, ...fields } });
      const value = form.value ? toMinor(form.value) : null;
      const created = await admin('external-holdings', {
        method: 'POST',
        body: { username, ...fields, ...(form.managedBy === 'external' && value != null && { balanceMinor: value }) },
      });
      if (form.managedBy === 'nomad' && value != null) {
        await admin('external-holdings', { method: 'PATCH', body: { id: created.holding.id, snapshotDate: todayKampala(), snapshotValueMinor: value } });
      }
      return created;
    });
    if (r) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal title={editing ? `Edit ${holding.providerName}` : 'Add a holding'} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <Field label="Provider / vehicle">
          <input value={form.providerName} onChange={set('providerName')} required />
        </Field>
        <Field label="Type">
          <select value={form.productType} onChange={set('productType')}>
            {Object.entries(PRODUCT_TYPES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Managed by" hint="Nomad: valued from dated snapshots. External: one current value.">
          <select value={form.managedBy} onChange={set('managedBy')}>
            <option value="external">External (on record)</option>
            <option value="nomad">Nomad</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="invited">Invited (not yet counted)</option>
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Amount invested (UGX)">
          <input inputMode="decimal" value={form.invested} onChange={set('invested')} />
        </Field>
        <Field label="Rate (% a year)">
          <input inputMode="decimal" value={form.rate} onChange={set('rate')} placeholder="e.g. 18" />
        </Field>
        <Field label="Held in currency" hint="e.g. UGX, KES, USD">
          <input value={form.currency} onChange={set('currency')} maxLength={3} />
        </Field>
        <Field label="Sector">
          <input value={form.sector} onChange={set('sector')} placeholder="e.g. Money market" />
        </Field>
        {!editing && (
          <Field label="Current value (UGX)" hint={form.managedBy === 'nomad' ? "Recorded as today's snapshot" : 'Counts toward their position'}>
            <input inputMode="decimal" value={form.value} onChange={set('value')} />
          </Field>
        )}
        <Field label="Notes" wide>
          <textarea value={form.notes} onChange={set('notes')} />
        </Field>
        {editing && <Notice tone="info">Blank fields keep their current value. If this member's sheet is synced, rate, notes, start date and amount invested are refreshed from it each morning.</Notice>}
        <div className="form-actions">
          <Result action={action} />
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={action.busy}>
            {editing ? 'Save' : 'Add holding'}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export default function Investments({ data, username, reload }) {
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);

  return (
    <Panel
      title="Investments & other holdings"
      flush
      actions={
        <Btn size="sm" onClick={() => setModal({ kind: 'add' })}>
          Add holding
        </Btn>
      }
    >
      {data.holdings.length === 0 ? (
        <Empty>Nothing on record yet.</Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Holding</th>
              <th className="num">Invested</th>
              <th className="num">Value</th>
              <th className="num">Rate</th>
              <th>Sector</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h) => (
              <Fragment key={h.id}>
                <tr className={h.status !== 'active' ? 'dim' : ''}>
                  <td>
                    <div className="cell-title">
                      {h.providerName} <Badge tone={h.managedBy === 'nomad' ? 'ink' : 'neutral'}>{h.managedBy === 'nomad' ? 'Nomad' : 'External'}</Badge>{' '}
                      {h.status !== 'active' && <Badge tone="gold">{h.status}</Badge>}
                    </div>
                    <div className="cell-sub">
                      {PRODUCT_TYPES[h.productType]}
                      {h.currency ? ` · ${h.currency}` : ''}
                      {h.startDate ? ` · since ${day(h.startDate)}` : ''}
                    </div>
                  </td>
                  <td className="num">{ugx(h.investedMinor)}</td>
                  <td className="num">
                    <div className="cell-title">{ugx(h.valueMinor)}</div>
                    <div className="cell-sub">{h.valueDate ? day(h.valueDate) : 'no value yet'}</div>
                  </td>
                  <td className="num">{pctFromBps(h.interestRateBps)}</td>
                  <td>{h.sector || <span className="muted">—</span>}</td>
                  <td>
                    <div className="row-actions">
                      <Btn size="sm" onClick={() => setModal({ kind: 'value', holding: h })}>
                        Record value
                      </Btn>
                      <Btn size="sm" variant="outline" onClick={() => setModal({ kind: 'edit', holding: h })}>
                        Edit
                      </Btn>
                      {(h.snapshots.length > 0 || h.notes) && (
                        <Btn size="sm" variant="outline" onClick={() => setOpen(open === h.id ? null : h.id)}>
                          {open === h.id ? 'Hide' : 'More'}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
                {open === h.id && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--surface-ground)' }}>
                      {h.notes && <p className="small" style={{ marginTop: 0 }}>{h.notes}</p>}
                      {h.snapshots.length > 0 && (
                        <div className="small">
                          <span className="field-label">Recent values: </span>
                          {h.snapshots.map((sn) => `${day(sn.date)} ${ugx(sn.valueMinor)}`).join(' · ')}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {modal?.kind === 'value' && <RecordValue holding={modal.holding} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.kind === 'edit' && <HoldingForm username={username} holding={modal.holding} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.kind === 'add' && <HoldingForm username={username} onClose={() => setModal(null)} onSaved={reload} />}
    </Panel>
  );
}
