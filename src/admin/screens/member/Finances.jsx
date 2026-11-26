import { useState } from 'react';
import { admin } from '../../api.js';
import { ARCHETYPES, ARCHETYPE_BY_ID } from '../../../data/archetypes.js';
import { toMonthlyMinor, independenceRatio } from '../../../utils/independence.js';
import { dateTime, day, todayKampala, toMinor, ugx } from '../../money.js';
import { current } from '../../stage.js';
import { Badge, Btn, Empty, Field, Modal, Notice, Panel, Result, useAction } from '../../ui.jsx';

const CATEGORIES = { household: 'Household', rent: 'Rent', school_fees: 'School fees', medical: 'Medical', transport: 'Transport', other: 'Other' };
const FREQUENCIES = { monthly: 'Monthly', termly: 'Termly (3 a year)', yearly: 'Yearly' };


/**
 * Appends a cost or income row. Nothing is edited: a new row with a later
 * "from" date replaces the figure, and 0 retires it.
 */
function AddRow({ kind, username, preset, onClose, onSaved }) {
  const isCost = kind === 'expense';
  const [form, setForm] = useState({
    category: preset?.category ?? 'household',
    label: preset?.label ?? '',
    incomeKind: preset?.kind ?? 'active',
    amount: '',
    frequency: preset?.frequency ?? 'monthly',
    effectiveFrom: todayKampala(),
  });
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const minor = toMinor(form.amount);

  const submit = async (e) => {
    e.preventDefault();
    const row = { amountMinor: minor, frequency: form.frequency, effectiveFrom: form.effectiveFrom };
    const body = isCost ? { username, expenses: [{ ...row, category: form.category }] } : { username, income: [{ ...row, label: form.label.trim(), kind: form.incomeKind }] };
    const r = await action.run(() => admin('member-finances', { method: 'POST', body }));
    if (r) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal title={preset ? `Change ${isCost ? CATEGORIES[preset.category] : preset.label}` : isCost ? 'Add a cost' : 'Add income'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {isCost ? (
          <Field label="Category">
            <select value={form.category} onChange={set('category')} disabled={!!preset}>
              {Object.entries(CATEGORIES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Label">
              <input value={form.label} onChange={set('label')} placeholder="e.g. Salary, Rental income" required disabled={!!preset} />
            </Field>
            <Field label="Kind" hint="Passive: earned without working (rent, dividends)">
              <select value={form.incomeKind} onChange={set('incomeKind')} disabled={!!preset}>
                <option value="active">Active</option>
                <option value="passive">Passive</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Amount (UGX)" hint={preset ? '0 removes it' : undefined}>
          <input inputMode="decimal" value={form.amount} onChange={set('amount')} required autoFocus />
        </Field>
        <Field label="How often">
          <select value={form.frequency} onChange={set('frequency')}>
            {Object.entries(FREQUENCIES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={form.effectiveFrom} onChange={set('effectiveFrom')} required />
        </Field>
        <div className="form-actions">
          <Result action={action} />
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={action.busy || minor == null || minor < 0}>
            Save
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function SetStage({ username, current: currentStage, onClose, onSaved }) {
  const [stage, setStage] = useState(currentStage ?? '');
  const [note, setNote] = useState('');
  const action = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const r = await action.run(() => admin('member-finances', { method: 'POST', body: { username, stage: stage || null, note: note.trim() || undefined } }));
    if (r) {
      onSaved();
      onClose();
    }
  };
  return (
    <Modal title="Set journey stage" onClose={onClose}>
      <form className="form form-1" onSubmit={submit}>
        <Field label="Stage" hint="Overrides the stage the app works out from their balance sheet and age">
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Let the app decide (no override)</option>
            {ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" hint="Why — kept with the change">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
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

export default function Finances({ data, username, reload }) {
  const [modal, setModal] = useState(null);
  const { expenses, income, placements } = data.finances;
  const costs = current(expenses, (e) => e.category);
  const incomes = current(income, (i) => i.label);
  const monthlyCosts = costs.reduce((sum, e) => sum + toMonthlyMinor(e.amountMinor, e.frequency), 0);
  const monthlyActive = incomes.filter((i) => i.kind === 'active').reduce((sum, i) => sum + toMonthlyMinor(i.amountMinor, i.frequency), 0);
  const monthlyPassive = incomes.filter((i) => i.kind === 'passive').reduce((sum, i) => sum + toMonthlyMinor(i.amountMinor, i.frequency), 0);
  const liquid = data.accounts.filter((a) => a.kind === 'liquid' && !a.isGroup && !a.closedAt).reduce((sum, a) => sum + Number(a.balanceMinor), 0);
  const ratio = independenceRatio(monthlyPassive, monthlyCosts);
  const stage = placements[0]?.stage ?? null;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Costs a month</div>
          <div className="stat-value">{monthlyCosts ? ugx(monthlyCosts) : '—'}</div>
          <div className="stat-hint">{costs.length} categories on record</div>
        </div>
        <div className="stat">
          <div className="stat-label">Income a month</div>
          <div className="stat-value">{monthlyActive + monthlyPassive ? ugx(monthlyActive + monthlyPassive) : '—'}</div>
          <div className="stat-hint">{ugx(monthlyPassive)} of it passive (declared)</div>
        </div>
        <div className="stat">
          <div className="stat-label">Runway</div>
          <div className="stat-value">{monthlyCosts ? `${(liquid / monthlyCosts).toFixed(1)} months` : '—'}</div>
          <div className="stat-hint">Liquid fund ÷ monthly costs</div>
        </div>
        <div className="stat">
          <div className="stat-label">Declared passive ÷ costs</div>
          <div className="stat-value">{ratio == null ? '—' : `${Math.round(ratio * 100)}%`}</div>
          <div className="stat-hint">Excludes projected holding income</div>
        </div>
      </div>

      {costs.length === 0 && <Notice tone="warning">No costs on record yet — their journey stage, runway and independence can't be worked out until there are.</Notice>}

      <div className="grid-2">
        <Panel title="Day-to-day costs" flush actions={<Btn size="sm" onClick={() => setModal({ kind: 'expense' })}>Add cost</Btn>}>
          {costs.length === 0 ? (
            <Empty>None on record.</Empty>
          ) : (
            <table className="data">
              <tbody>
                {costs.map((e) => (
                  <tr key={e.category}>
                    <td>
                      <div className="cell-title">{CATEGORIES[e.category]}</div>
                      <div className="cell-sub">since {day(e.effectiveFrom)}</div>
                    </td>
                    <td className="num">
                      {ugx(e.amountMinor)} <span className="muted small">{e.frequency}</span>
                      {e.frequency !== 'monthly' && <div className="cell-sub">{ugx(toMonthlyMinor(e.amountMinor, e.frequency))} a month</div>}
                    </td>
                    <td className="num">
                      <Btn size="sm" variant="outline" onClick={() => setModal({ kind: 'expense', preset: e })}>
                        Change
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Income" flush actions={<Btn size="sm" onClick={() => setModal({ kind: 'income' })}>Add income</Btn>}>
          {incomes.length === 0 ? (
            <Empty>None on record.</Empty>
          ) : (
            <table className="data">
              <tbody>
                {incomes.map((i) => (
                  <tr key={i.label}>
                    <td>
                      <div className="cell-title">
                        {i.label} <Badge tone={i.kind === 'passive' ? 'success' : 'neutral'}>{i.kind}</Badge>
                      </div>
                      <div className="cell-sub">since {day(i.effectiveFrom)}</div>
                    </td>
                    <td className="num">
                      {ugx(i.amountMinor)} <span className="muted small">{i.frequency}</span>
                    </td>
                    <td className="num">
                      <Btn size="sm" variant="outline" onClick={() => setModal({ kind: 'income', preset: i })}>
                        Change
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel title="Journey stage" actions={<Btn size="sm" variant="outline" onClick={() => setModal({ kind: 'stage' })}>Set stage</Btn>}>
        {stage ? (
          <p style={{ margin: 0 }}>
            Set to <strong>{ARCHETYPE_BY_ID[stage]?.name ?? stage}</strong> by Nomad on {dateTime(placements[0].createdAt)}
            {placements[0].note ? ` — “${placements[0].note}”` : ''}.
          </p>
        ) : (
          <p style={{ margin: 0 }} className="muted">
            No override — the app works it out from their balance sheet{costs.length ? '' : ' (or their age, until costs are on record)'}.
          </p>
        )}
      </Panel>

      {(expenses.length > costs.length || income.length > incomes.length || placements.length > 1) && (
        <Panel title="Full history" flush>
          <table className="data">
            <tbody>
              {[
                ...expenses.map((e) => ({ at: e.createdAt, text: `${CATEGORIES[e.category]}: ${ugx(e.amountMinor)} ${e.frequency} from ${day(e.effectiveFrom)}` })),
                ...income.map((i) => ({ at: i.createdAt, text: `${i.label} (${i.kind}): ${ugx(i.amountMinor)} ${i.frequency} from ${day(i.effectiveFrom)}` })),
                ...placements.map((p) => ({ at: p.createdAt, text: `Stage: ${p.stage ? ARCHETYPE_BY_ID[p.stage]?.name ?? p.stage : 'override lifted'}${p.note ? ` — ${p.note}` : ''}` })),
              ]
                .sort((a, b) => new Date(b.at) - new Date(a.at))
                .map((row, i) => (
                  <tr key={i}>
                    <td className="muted">{dateTime(row.at)}</td>
                    <td>{row.text}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
      )}

      {(modal?.kind === 'expense' || modal?.kind === 'income') && <AddRow kind={modal.kind} preset={modal.preset} username={username} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.kind === 'stage' && <SetStage username={username} current={stage} onClose={() => setModal(null)} onSaved={reload} />}
    </>
  );
}
