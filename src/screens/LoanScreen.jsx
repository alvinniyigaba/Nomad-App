import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Badge from '../components/ds/Badge';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { fromMinor, formatFullDate } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import HideBalancesButton from '../components/HideBalancesButton';
import { loanAction, useLoans } from '../hooks/useLoans';
import { LOAN_STATUS_BADGE as STATUS_BADGE, ordinal, rateLabel, repaidShare } from '../utils/loans';
import { Amount, BackTitle, Card, Eyebrow, ItemMeta, ItemTitle, ProgressBar, Screen } from '../components/ui';

const INPUT = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '12px 14px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-heading)',
  outline: 'none',
};

function Detail({ label, value, wide }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <Eyebrow tracking="0.14em">{label}</Eyebrow>
      <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Records a payment: "I paid" for a borrower, "I received" for a lender, either way on a private ledger. */
function RecordPayment({ loan, onDone }) {
  const lent = loan.direction === 'lent';
  const choices = loan.parties.filter((p) => (loan.kind === 'external' ? false : p.role !== loan.myRole));
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(localToday());
  const [memo, setMemo] = useState('');
  const [other, setOther] = useState(choices.length === 1 ? choices[0].id : '');
  const [key] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) {
    return (
      <div style={{ marginTop: 18 }}>
        <Button variant="outline" size="md" full onClick={() => setOpen(true)}>
          {loan.kind === 'external' ? 'Record a payment' : lent ? 'Record money you received' : 'Record a payment you made'}
        </Button>
      </div>
    );
  }

  const whole = Number(String(amount).replace(/[^\d]/g, ''));
  async function save() {
    if (!whole) return setError('Enter the amount.');
    if (choices.length > 1 && !other) return setError(lent ? 'Choose who paid you.' : 'Choose who you paid.');
    setBusy(true);
    setError('');
    try {
      await loanAction('record-payment', {
        agreementId: loan.id,
        amountMinor: String(whole * 100),
        paidOn,
        memo,
        idempotencyKey: key,
        ...(loan.kind === 'member' && (lent ? { payerPartyId: other } : { payeePartyId: other })),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card top={18} padding="16px 18px">
      <ItemTitle size={14}>{loan.kind === 'external' ? 'Record a payment' : lent ? 'Money you received' : 'A payment you made'}</ItemTitle>
      <ItemMeta top={4}>
        {loan.kind === 'external' ? 'It counts straight away.' : lent ? 'It counts straight away, because you received it.' : 'It counts once the person you paid confirms it.'}
      </ItemMeta>
      {choices.length > 1 && (
        <>
          <Eyebrow top={14} bottom={6} tracking="0.14em">{lent ? 'Paid by' : 'Paid to'}</Eyebrow>
          <select style={INPUT} value={other} onChange={(e) => setOther(e.target.value)} aria-label={lent ? 'Paid by' : 'Paid to'}>
            <option value="">Choose…</option>
            {choices.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </>
      )}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Eyebrow bottom={6} tracking="0.14em">Amount (UGX)</Eyebrow>
          <input inputMode="numeric" style={INPUT} value={whole ? whole.toLocaleString('en-US') : ''} onChange={(e) => setAmount(e.target.value)} aria-label="Amount in UGX" />
        </div>
        <div>
          <Eyebrow bottom={6} tracking="0.14em">Date paid</Eyebrow>
          <input type="date" style={INPUT} value={paidOn} max={localToday()} min={loan.startDate ?? undefined} onChange={(e) => setPaidOn(e.target.value)} aria-label="Date paid" />
        </div>
      </div>
      <Eyebrow top={12} bottom={6} tracking="0.14em">Note (optional)</Eyebrow>
      <input style={INPUT} value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. January, by mobile money" aria-label="Note" />
      {error && <div role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--accent-clay)' }}>{error}</div>}
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <Button variant="primary" size="md" style={{ flex: 1 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button variant="ghost" size="md" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}

/**
 * One loan in full: what's outstanding, its terms and plan, the people on
 * it, payments waiting for confirmation and every repayment, with the
 * actions open to this member. Opened from Borrow as /loan?id=<loan id>.
 */
export default function LoanScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, loans, error, refetch } = useLoans();
  const { fmt, ksh } = useMoney();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [formKey, setFormKey] = useState(0);

  if (status === 'loading' && loans.length === 0) return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const loan = loans.find((l) => l.id === searchParams.get('id'));
  const back = <BackTitle onBack={() => navigate('/borrow')}>{loan ? (loan.counterparty.length > 26 ? 'LOAN' : loan.counterparty.toUpperCase()) : 'LOAN'}</BackTitle>;
  if (!loan) {
    return (
      <Screen>
        {back}
        <div style={{ marginTop: 22, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>This loan isn&apos;t on your records.</div>
      </Screen>
    );
  }

  async function act(action, body, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    setActionError('');
    try {
      await loanAction(action, body);
      await refetch();
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const lent = loan.direction === 'lent';
  const isAgreement = loan.source === 'agreement';
  const proposed = loan.status === 'proposed';
  const live = isAgreement && ['active', 'overdue'].includes(loan.status);
  const totalDue = fromMinor(loan.totalDueMinor ?? loan.principalMinor);
  const interest = fromMinor(loan.interestMinor ?? '0');
  const repaid = fromMinor(loan.repaidMinor);
  const badge = STATUS_BADGE[loan.status];
  const joint = loan.liability === 'joint';
  const plan = loan.plan;
  const borrowerParties = loan.parties.filter((p) => p.role === 'borrower');
  // On a joint loan the borrowers are behind (or not) together.
  const behindBorrowers = joint
    ? Number(borrowerParties[0]?.behindMinor) > 0
      ? [{ id: 'joint', name: borrowerParties.map((p) => p.name).join(' & '), plural: true, behindMinor: borrowerParties[0].behindMinor }]
      : []
    : borrowerParties.filter((p) => Number(p.behindMinor) > 0);
  const waitingOn =loan.parties.filter((p) => !p.accepted && !p.declined && !p.isMe).map((p) => p.name);

  const headline = lent ? `${loan.counterparty} still ${loan.parties.filter((p) => p.role === 'borrower').length > 1 ? 'owe' : 'owes'} you` : joint ? 'You still owe together' : `You still owe ${loan.counterparty}`;

  return (
    <Screen>
      {back}

      {loan.needsMyAnswer && (
        <Card top={18} padding="16px 18px" style={{ borderColor: 'var(--accent-gold)' }}>
          <ItemTitle size={14}>Accept this loan?</ItemTitle>
          <ItemMeta top={4}>
            {lent ? `You’d be lending UGX ${fmt(fromMinor(loan.principalMinor))} to ${loan.counterparty}.` : `You’d be borrowing UGX ${fmt(fromMinor(loan.principalMinor))} from ${loan.counterparty}${joint ? ', jointly' : ''}.`} Check the details below. It counts for everyone once everyone has accepted.
          </ItemMeta>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <Button variant="primary" size="md" style={{ flex: 1 }} disabled={busy} onClick={() => act('answer', { agreementId: loan.id, answer: 'accept' })}>Accept</Button>
            <Button variant="outline" size="md" style={{ flex: 1 }} disabled={busy} onClick={() => act('answer', { agreementId: loan.id, answer: 'decline' }, 'Decline this loan? It will be cancelled for everyone on it.')}>Decline</Button>
          </div>
        </Card>
      )}
      {proposed && !loan.needsMyAnswer && (
        <Card top={18} padding="14px 16px">
          <ItemMeta top={0}>Waiting for {waitingOn.join(', ') || 'everyone'} to accept. It doesn’t count for anyone until then.</ItemMeta>
        </Card>
      )}

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <Eyebrow>{headline}</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          <HideBalancesButton />
        </div>
      </div>
      <Amount top={9}>{ksh(fromMinor(loan.outstandingMinor))}</Amount>
      <div style={{ marginTop: 4, fontWeight: 300, fontSize: 12, color: 'var(--text-faint)' }}>
        of {ksh(totalDue)} {interest > 0 ? `(${fmt(interest)} interest)` : lent ? 'lent' : 'borrowed'}
        {joint && !lent && ` · your share is ${fmt(fromMinor(loan.parties.find((p) => p.isMe)?.shareMinor ?? 0))}`}
      </div>

      <ProgressBar top={16} pct={repaidShare(loan) * 100} height={8} radius={0} />
      <div style={{ marginTop: 8, fontWeight: 500, fontSize: 12, color: 'var(--ink-green)' }}>
        {ksh(repaid)} repaid{joint && !lent ? ' together' : ''}
      </div>

      {plan && live && (
        <Card top={18} padding="14px 16px" style={Number(plan.behindMinor) > 0 ? { borderColor: 'var(--accent-clay)' } : undefined}>
          {Number(plan.behindMinor) > 0 ? (
            <ItemTitle size={13}>{joint ? 'Together you are' : 'You are'} behind by {ksh(fromMinor(plan.behindMinor))}</ItemTitle>
          ) : (
            <ItemTitle size={13}>{joint ? 'On track together' : 'On track'}</ItemTitle>
          )}
          {plan.next && <ItemMeta top={4}>Next payment: {ksh(fromMinor(plan.next.amountMinor))} by {formatFullDate(plan.next.dueDate)}</ItemMeta>}
        </Card>
      )}

      {lent && live && loan.firstDueDate && (
        <Card top={18} padding="14px 16px" style={behindBorrowers.length ? { borderColor: 'var(--accent-clay)' } : undefined}>
          {behindBorrowers.length === 0 ? (
            <ItemTitle size={13}>Repayments are on track</ItemTitle>
          ) : (
            behindBorrowers.map((p) => (
              <ItemTitle key={p.id} size={13}>
                {p.name} {p.plural ? 'are' : 'is'} behind by {ksh(fromMinor(p.behindMinor))}
              </ItemTitle>
            ))
          )}
        </Card>
      )}

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 16, columnGap: 14 }}>
        <Detail label={lent ? 'Lent on' : 'Borrowed on'} value={loan.startDate ? formatFullDate(loan.startDate) : 'To confirm'} />
        <Detail label={loan.firstDueDate ? 'Final payment due' : 'Due'} value={loan.dueDate ? formatFullDate(loan.dueDate) : isAgreement ? 'No date set' : 'To confirm'} />
        {isAgreement && <Detail label="Interest" value={loan.rateBps ? `${rateLabel(loan.rateBps, loan.ratePeriod)}, flat` : 'None'} />}
        {isAgreement && loan.parties.filter((p) => p.role === 'borrower').length > 1 && <Detail label="Owed" value={joint ? 'Jointly' : 'Split by share'} />}
        {loan.firstDueDate && (
          <Detail
            wide
            label="Repayment"
            value={`${loan.termMonths} monthly payments on the ${ordinal(loan.dueDay)}, from ${formatFullDate(loan.firstDueDate)}${plan?.schedule?.length ? ` · ${fmt(fromMinor(plan.schedule[0].amountMinor))} a month${joint ? ' together' : ''}` : ''}`}
          />
        )}
        {!isAgreement && <Detail label="Terms" value={loan.terms || 'To confirm'} wide />}
        {isAgreement && loan.terms && <Detail label="Terms" value={loan.terms} wide />}
        {loan.notes && <Detail label="Notes" value={loan.notes} wide />}
      </div>

      {loan.kind === 'member' && (
        <>
          <Eyebrow top={26}>On this loan</Eyebrow>
          {loan.parties.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ minWidth: 0 }}>
                <ItemTitle size={13}>
                  {p.name}
                  {p.isMe ? ' (you)' : ''}
                </ItemTitle>
                <ItemMeta top={3}>
                  {p.role === 'lender' ? 'Lender' : 'Borrower'} · share {fmt(fromMinor(p.shareMinor))}
                  {proposed ? (p.accepted ? ' · accepted' : p.declined ? ' · declined' : ' · hasn’t answered') : ''}
                </ItemMeta>
              </div>
              {!proposed && (
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  {p.role === 'borrower' ? (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(p.paidMinor))} paid</div>
                      {!joint && <ItemMeta top={3}>{Number(p.outstandingMinor) > 0 ? `${fmt(fromMinor(p.outstandingMinor))} left` : 'Paid off'}</ItemMeta>}
                      {!joint && Number(p.behindMinor) > 0 && <div style={{ marginTop: 3, fontSize: 11, color: 'var(--accent-clay)' }}>behind {fmt(fromMinor(p.behindMinor))}</div>}
                    </>
                  ) : (
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(p.receivedMinor))} received</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {loan.pendingPayments.length > 0 && (
        <>
          <Eyebrow top={26}>Waiting for confirmation</Eyebrow>
          {loan.pendingPayments.map((p) => (
            <Card key={p.id} top={10} padding="14px 16px">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <ItemTitle size={13}>
                    {p.payer} → {p.payee}
                  </ItemTitle>
                  <ItemMeta top={3}>
                    {formatFullDate(p.paidOn)}
                    {p.memo ? ` · ${p.memo}` : ''}
                  </ItemMeta>
                </div>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(p.amountMinor))}</div>
              </div>
              {p.canConfirm ? (
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <Button variant="primary" size="sm" style={{ flex: 1 }} disabled={busy} onClick={() => act('decide-payment', { paymentId: p.id, decision: 'confirm' })}>Confirm I received it</Button>
                  <Button variant="outline" size="sm" style={{ flex: 1 }} disabled={busy} onClick={() => act('decide-payment', { paymentId: p.id, decision: 'reject' }, 'Say you didn’t receive this payment? It won’t count.')}>Didn’t receive</Button>
                </div>
              ) : (
                <ItemMeta top={8}>
                  Waiting for {p.payee} to confirm.
                  {p.canCancel && (
                    <button type="button" disabled={busy} onClick={() => act('cancel-payment', { paymentId: p.id }, 'Withdraw this payment?')} style={{ marginLeft: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-green)', fontSize: 12, textDecoration: 'underline' }}>
                      Withdraw it
                    </button>
                  )}
                </ItemMeta>
              )}
            </Card>
          ))}
        </>
      )}

      {actionError && <div role="alert" style={{ marginTop: 14, fontSize: 13, color: 'var(--accent-clay)' }}>{actionError}</div>}

      {live && Number(loan.loanTotals?.outstandingMinor ?? loan.outstandingMinor) > 0 && <RecordPayment key={`${loan.id}-${formKey}`} loan={loan} onDone={() => refetch().then(() => setFormKey((k) => k + 1))} />}

      <Eyebrow top={26}>Repayments</Eyebrow>
      {loan.repayments.length === 0 ? (
        <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, color: 'var(--text-muted)' }}>No repayments yet.</div>
      ) : (
        [...loan.repayments].reverse().map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <ItemTitle size={13}>{formatFullDate(r.paidOn)}</ItemTitle>
              <ItemMeta top={4}>{[loan.kind === 'member' && r.payer ? `${r.payer} → ${r.payee}` : null, r.memo].filter(Boolean).join(' · ') || ' '}</ItemMeta>
            </div>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-heading)' }}>{fmt(fromMinor(r.amountMinor))}</div>
          </div>
        ))
      )}

      {isAgreement && loan.createdByMe && (proposed || (loan.kind === 'external' && loan.repayments.length === 0)) && (
        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <button type="button" disabled={busy} onClick={() => act('cancel', { agreementId: loan.id }, proposed ? 'Cancel this loan for everyone on it?' : 'Remove this loan from your records?').then((ok) => ok && navigate('/borrow'))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-clay)', fontSize: 13, textDecoration: 'underline' }}>
            {proposed ? 'Cancel this loan' : 'Remove this loan'}
          </button>
        </div>
      )}
    </Screen>
  );
}
