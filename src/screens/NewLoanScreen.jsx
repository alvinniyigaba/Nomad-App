import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { BackTitle, Card, Eyebrow, ItemMeta, ItemTitle, Screen } from '../components/ui';
import { useAppState } from '../state/AppStateContext';
import { loanAction } from '../hooks/useLoans';
import { buildSchedule, flatInterestMinor, nthDueDate } from '../../api/_lib/loanMath.js';
import { fmt, formatFullDate } from '../utils/format';
import { ordinal, rateLabel } from '../utils/loans';

const INPUT = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '13px 14px',
  fontFamily: 'var(--font-sans)',
  fontWeight: 400,
  fontSize: 14,
  color: 'var(--text-heading)',
  outline: 'none',
};

function Label({ children, top = 22 }) {
  return <Eyebrow top={top} bottom={8}>{children}</Eyebrow>;
}

function Hint({ children }) {
  return <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>{children}</div>;
}

/** A row of mutually exclusive options, in the light look. */
function Choice({ options, value, onChange, label, minWidth = 120 }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{ flex: '1 1 0', minWidth, minHeight: 44, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: on ? 500 : 400, border: `1px solid ${on ? 'var(--ink-green)' : 'var(--border-default)'}`, background: on ? 'var(--ink-green)' : 'var(--surface-card)', color: on ? 'var(--bone)' : 'var(--text-body)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Member chips: tap to add or remove. */
function MemberPicker({ members, selected, onToggle, disabled = [] }) {
  if (members === null) return <Hint>Loading members…</Hint>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {members.filter((u) => !disabled.includes(u)).map((u) => {
        const on = selected.includes(u);
        return (
          <button
            key={u}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(u)}
            style={{ minHeight: 40, padding: '0 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, border: `1px solid ${on ? 'var(--ink-green)' : 'var(--border-default)'}`, background: on ? 'var(--ink-green)' : 'var(--surface-card)', color: on ? 'var(--bone)' : 'var(--text-body)' }}
          >
            {on ? '✓ ' : ''}
            {u}
          </button>
        );
      })}
    </div>
  );
}

const toWhole = (v) => {
  const n = Number(String(v).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Splits `total` shillings into `n` whole-shilling parts that add up exactly; the last takes any remainder. */
function equalParts(total, n) {
  if (n === 0) return [];
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - each * (n - 1) : each));
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextMonth(today) {
  const [y, m] = today.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Sets up a loan: with other Nomad members (each of them then accepts it),
 * or a private record of a loan with someone outside Nomad. Opened from
 * Borrow as /loan/new.
 */
export default function NewLoanScreen() {
  const navigate = useNavigate();
  const { user } = useAppState();
  const me = user?.username;
  const today = localToday();

  const [kind, setKind] = useState('member');
  const [myRole, setMyRole] = useState('borrower');
  const [amount, setAmount] = useState('');
  const [externalName, setExternalName] = useState('');
  const [members, setMembers] = useState(null);
  const [otherSide, setOtherSide] = useState([]);
  const [mySide, setMySide] = useState([]);
  const [customShares, setCustomShares] = useState(false);
  const [shares, setShares] = useState({});
  const [liability, setLiability] = useState('split');
  const [rate, setRate] = useState('0');
  const [ratePeriod, setRatePeriod] = useState('month');
  const [hasPlan, setHasPlan] = useState(true);
  const [termMonths, setTermMonths] = useState('12');
  const [firstMonth, setFirstMonth] = useState(nextMonth(today));
  const [dueDay, setDueDay] = useState('30');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setMembers(d.users ?? []))
      .catch(() => setMembers([]));
  }, []);

  const otherRole = myRole === 'lender' ? 'borrower' : 'lender';
  const total = toWhole(amount);

  // Everyone on the loan, with their share in whole shillings.
  const people = useMemo(() => {
    if (kind === 'external') {
      return [
        { username: me, role: myRole, share: total },
        { externalName: externalName.trim(), role: otherRole, share: total },
      ];
    }
    const sides = { [myRole]: [me, ...mySide], [otherRole]: otherSide };
    const list = [];
    for (const role of ['lender', 'borrower']) {
      const names = sides[role];
      const parts = equalParts(total, names.length);
      names.forEach((u, i) => list.push({ username: u, role, share: customShares && names.length > 1 ? toWhole(shares[`${role}:${u}`] ?? '') : parts[i] }));
    }
    return list;
  }, [kind, me, myRole, otherRole, mySide, otherSide, total, customShares, shares, externalName]);

  const borrowers = people.filter((p) => p.role === 'borrower');
  const lenders = people.filter((p) => p.role === 'lender');
  const rateBps = Math.round(Number(rate || 0) * 100);
  const term = hasPlan || rateBps > 0 ? toWhole(termMonths) || null : null;
  const day = Math.min(31, toWhole(dueDay) || 30);
  const plan = useMemo(() => (hasPlan && term ? { termMonths: term, firstDueDate: nthDueDate(`${firstMonth}-01`, day, 0), dueDay: day } : null), [hasPlan, term, firstMonth, day]);
  const effectiveLiability = borrowers.length > 1 ? liability : 'split';

  // What each borrower will repay, worked out exactly as the server will.
  const preview = useMemo(() => {
    const terms = { rateBps, ratePeriod, termMonths: term };
    const rows = borrowers.map((b) => {
      const shareMinor = BigInt(b.share) * 100n;
      const totalMinor = shareMinor + flatInterestMinor(shareMinor, terms);
      return { ...b, totalMinor, schedule: plan ? buildSchedule(totalMinor, plan) : [] };
    });
    const grand = rows.reduce((s, r) => s + r.totalMinor, 0n);
    return { rows, grand, jointSchedule: plan && effectiveLiability === 'joint' ? buildSchedule(grand, plan) : [] };
  }, [borrowers, rateBps, ratePeriod, term, plan, effectiveLiability]);

  const sumOf = (list) => list.reduce((s, p) => s + p.share, 0);
  const problems = [];
  if (!total) problems.push('Enter the loan amount.');
  if (kind === 'external' && !externalName.trim()) problems.push(`Enter the name of the person you’re ${myRole === 'lender' ? 'lending to' : 'borrowing from'}.`);
  if (kind === 'member' && otherSide.length === 0) problems.push(`Choose who you’re ${myRole === 'lender' ? 'lending to' : 'borrowing from'}.`);
  if (total && (sumOf(borrowers) !== total || sumOf(lenders) !== total)) problems.push('The shares on each side must add up to the loan amount.');
  if (rateBps > 0 && !term) problems.push('A loan with interest needs a number of months.');
  if (hasPlan && !term) problems.push('Enter how many monthly payments.');

  function toggle(setter, u) {
    setter((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  }

  async function submit() {
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { id } = await loanAction('create', {
        kind,
        principalMinor: String(total * 100),
        liability: effectiveLiability,
        rateBps,
        ratePeriod,
        termMonths: term,
        startDate,
        firstDueDate: plan?.firstDueDate ?? null,
        dueDay: plan?.dueDay ?? null,
        dueDate: !plan && dueDate ? dueDate : null,
        notes,
        parties: people.map((p) => ({ ...(p.username ? { username: p.username } : { externalName: p.externalName }), role: p.role, shareMinor: String(p.share * 100) })),
      });
      navigate(`/loan?id=${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const sideLabel = (role) => (role === 'lender' ? 'Lending' : 'Borrowing');
  const shareInputs = (role, names) =>
    names.length > 1 &&
    customShares && (
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {names.map((u) => (
          <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-body)' }}>{u === me ? 'You' : u}</div>
            <input inputMode="numeric" aria-label={`${u}’s share`} style={{ ...INPUT, width: 150 }} value={shares[`${role}:${u}`] ?? ''} onChange={(e) => setShares((s) => ({ ...s, [`${role}:${u}`]: e.target.value }))} placeholder="UGX" />
          </div>
        ))}
      </div>
    );

  return (
    <Screen>
      <BackTitle close onBack={() => navigate('/borrow')}>NEW LOAN</BackTitle>

      <Label>Who is it with?</Label>
      <Choice
        label="Who is it with?"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'member', label: 'Nomad members' },
          { value: 'external', label: 'Someone outside Nomad' },
        ]}
      />
      <Hint>{kind === 'member' ? 'Everyone on the loan sees it and accepts it. Payments are confirmed by whoever receives them.' : 'A private record for you only, to keep track of who owes you and who you owe.'}</Hint>

      <Label>You are</Label>
      <Choice
        label="You are"
        value={myRole}
        onChange={(v) => {
          setMyRole(v);
          setMySide([]);
          setOtherSide([]);
          setShares({});
        }}
        options={[
          { value: 'borrower', label: 'Borrowing' },
          { value: 'lender', label: 'Lending' },
        ]}
      />

      <Label>Loan amount (UGX)</Label>
      <input inputMode="numeric" style={INPUT} value={amount ? fmt(total) : ''} onChange={(e) => setAmount(e.target.value)} placeholder="2,000,000" aria-label="Loan amount in UGX" />

      {kind === 'external' ? (
        <>
          <Label>{myRole === 'lender' ? 'Lent to' : 'Borrowed from'}</Label>
          <input style={INPUT} value={externalName} maxLength={80} onChange={(e) => setExternalName(e.target.value)} placeholder="Their name" aria-label="Their name" />
        </>
      ) : (
        <>
          <Label>{myRole === 'lender' ? 'Lending to' : 'Borrowing from'}</Label>
          <MemberPicker members={members} selected={otherSide} onToggle={(u) => toggle(setOtherSide, u)} disabled={mySide} />
          {shareInputs(otherRole, otherSide)}

          <Label>Also {sideLabel(myRole).toLowerCase()} with you (optional)</Label>
          <MemberPicker members={members} selected={mySide} onToggle={(u) => toggle(setMySide, u)} disabled={otherSide} />
          <Hint>Add anyone who is {myRole === 'lender' ? 'lending' : 'borrowing'} alongside you.</Hint>
          {shareInputs(myRole, [me, ...mySide])}

          {(otherSide.length > 1 || mySide.length > 0) && (
            <label style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-body)', cursor: 'pointer' }}>
              <input type="checkbox" checked={customShares} onChange={(e) => setCustomShares(e.target.checked)} />
              Set each person’s share (otherwise it’s split equally)
            </label>
          )}

          {borrowers.length > 1 && (
            <>
              <Label>How do the borrowers owe it?</Label>
              <Choice
                label="Split or joint"
                value={liability}
                onChange={setLiability}
                options={[
                  { value: 'split', label: 'Split' },
                  { value: 'joint', label: 'Joint' },
                ]}
              />
              <Hint>{liability === 'split' ? 'Each borrower owes only their own share and pays it off themselves.' : 'The borrowers owe the whole amount together. Any of them can pay; the app shows who has paid what.'}</Hint>
            </>
          )}
        </>
      )}

      <Label>Interest (flat)</Label>
      <div style={{ display: 'flex', gap: 10 }}>
        <input inputMode="decimal" style={{ ...INPUT, width: 110 }} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Interest rate in percent" />
        <div style={{ flex: 1 }}>
          <Choice
            label="Rate period"
            minWidth={0}
            value={ratePeriod}
            onChange={setRatePeriod}
            options={[
              { value: 'month', label: '% a month' },
              { value: 'year', label: '% a year' },
            ]}
          />
        </div>
      </div>
      <Hint>{rateBps > 0 ? `${rateLabel(rateBps, ratePeriod)}, on the original amount for the whole term.` : 'Leave at 0 for no interest.'}</Hint>

      <Label>Repayment</Label>
      <Choice
        label="Repayment"
        value={hasPlan ? 'plan' : 'open'}
        onChange={(v) => setHasPlan(v === 'plan')}
        options={[
          { value: 'plan', label: 'Fixed monthly payments' },
          { value: 'open', label: 'Pay when possible' },
        ]}
      />
      {(hasPlan || rateBps > 0) && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: hasPlan ? '1fr 1fr 1fr' : '1fr', gap: 10 }}>
          <div>
            <Eyebrow bottom={6} tracking="0.14em">Months</Eyebrow>
            <input inputMode="numeric" style={INPUT} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} aria-label="Number of months" />
          </div>
          {hasPlan && (
            <>
              <div>
                <Eyebrow bottom={6} tracking="0.14em">First payment</Eyebrow>
                <input type="month" style={INPUT} value={firstMonth} min={startDate.slice(0, 7)} onChange={(e) => setFirstMonth(e.target.value)} aria-label="Month of the first payment" />
              </div>
              <div>
                <Eyebrow bottom={6} tracking="0.14em">Due day</Eyebrow>
                <input inputMode="numeric" style={INPUT} value={dueDay} onChange={(e) => setDueDay(e.target.value)} aria-label="Day of the month payments are due" />
              </div>
            </>
          )}
        </div>
      )}
      {!hasPlan && (
        <>
          <Label top={14}>Due by (optional)</Label>
          <input type="date" style={INPUT} value={dueDate} min={startDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        </>
      )}

      <Label>Date the money changed hands</Label>
      <input type="date" style={INPUT} value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" />

      <Label>Note (optional)</Label>
      <input style={INPUT} value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="What it’s for, anything agreed" aria-label="Note" />

      {total > 0 && borrowers.every((b) => b.share > 0) && (
        <Card top={24} padding="16px 18px">
          <Eyebrow bottom={10}>What gets repaid</Eyebrow>
          {(effectiveLiability === 'joint'
            ? [{ key: 'joint', name: borrowers.map((b) => (b.username === me ? 'You' : b.username ?? b.externalName)).join(' & ') + ' together', totalMinor: preview.grand, schedule: preview.jointSchedule }]
            : preview.rows.map((r) => ({ key: r.username ?? r.externalName, name: r.username === me ? 'You' : r.username ?? r.externalName, totalMinor: r.totalMinor, schedule: r.schedule }))
          ).map((r) => (
            <div key={r.key} style={{ padding: '8px 0', borderTop: '1px solid var(--border-default)' }}>
              <ItemTitle size={13}>
                {r.name}: UGX {fmt(Number(r.totalMinor) / 100)}
              </ItemTitle>
              {r.schedule.length > 0 && (
                <ItemMeta top={3}>
                  {r.schedule.length} payments of UGX {fmt(Number(r.schedule[0].amountMinor) / 100)}
                  {r.schedule[r.schedule.length - 1].amountMinor !== r.schedule[0].amountMinor ? ` (last one ${fmt(Number(r.schedule[r.schedule.length - 1].amountMinor) / 100)})` : ''}, on the {ordinal(plan.dueDay)} from {formatFullDate(r.schedule[0].dueDate)} to {formatFullDate(r.schedule[r.schedule.length - 1].dueDate)}
                </ItemMeta>
              )}
            </div>
          ))}
        </Card>
      )}

      {error && <div role="alert" style={{ marginTop: 16, fontSize: 13, color: 'var(--accent-clay)' }}>{error}</div>}

      <div style={{ marginTop: 22 }}>
        <Button variant="primary" size="lg" full disabled={submitting} onClick={submit}>
          {submitting ? 'Saving…' : kind === 'member' ? 'Send for acceptance' : 'Save loan'}
        </Button>
      </div>
      {kind === 'member' && <Hint>The loan counts once everyone on it has accepted.</Hint>}
    </Screen>
  );
}
