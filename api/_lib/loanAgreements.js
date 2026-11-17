import { query, withTransaction } from './db.js';
import { getLoansForUser as getLegacyLoansForUser } from './loans.js';
import { computeAgreement, validateAgreementShape } from './loanMath.js';

// Loan agreements: loans between Nomad members, and members' private
// ledgers of loans with people outside Nomad. The arithmetic is in
// loanMath.js; this file reads and writes the tables and decides who may
// see or do what. Every check is against the signed-in member's own party
// rows, so a member can only ever see or act on loans they are on.

const OPEN_PROPOSALS_LIMIT = 20;

/** Today's date in Kampala, where every member is: due dates turn at local midnight. */
export function todayInKampala(now = new Date()) {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

/** True when the loan_agreements tables haven't been created yet (schema not migrated). */
function isMissingTable(err) {
  return err?.code === '42P01';
}

const AGREEMENT_COLUMNS = `a.id, a.kind, a.created_by, a.liability, a.principal_minor, a.rate_bps, a.rate_period, a.term_months,
  a.start_date::text AS start_date, a.first_due_date::text AS first_due_date, a.due_day, a.due_date::text AS due_date,
  a.status, a.terms, a.notes, a.created_at`;

async function loadAgreements(client, agreementIds) {
  if (agreementIds.length === 0) return [];
  const { rows: agreements } = await client.query(`SELECT ${AGREEMENT_COLUMNS} FROM loan_agreements a WHERE a.id = ANY($1)`, [agreementIds]);
  const { rows: parties } = await client.query(
    `SELECT p.id, p.agreement_id, p.user_id, p.external_name, p.role, p.share_minor, p.accepted_at, p.declined_at, u.username, u.name, u.surname
     FROM loan_parties p LEFT JOIN users u ON u.id = p.user_id
     WHERE p.agreement_id = ANY($1) ORDER BY p.role DESC, p.created_at ASC`,
    [agreementIds],
  );
  const { rows: payments } = await client.query(
    `SELECT id, agreement_id, payer_party_id, payee_party_id, amount_minor, paid_on::text AS paid_on, memo, recorded_by, status, created_at
     FROM loan_payments WHERE agreement_id = ANY($1) ORDER BY paid_on ASC, created_at ASC`,
    [agreementIds],
  );
  return agreements.map((a) => ({
    agreement: a,
    parties: parties.filter((p) => p.agreement_id === a.id),
    payments: payments.filter((p) => p.agreement_id === a.id),
  }));
}

function displayName(party) {
  if (party.external_name) return party.external_name;
  const full = [party.name, party.surname].filter(Boolean).join(' ').trim();
  if (full) return full;
  const u = party.username ?? '';
  return u.charAt(0).toUpperCase() + u.slice(1);
}

function joinNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

const s = (v) => (v == null ? null : v.toString());
const shillings = (minor) => `UGX ${Number(minor / 100n).toLocaleString('en-US')}`;

/**
 * One agreement as `userId` sees it, in the same shape as the older private
 * loans (direction, counterparty, principal/repaid/outstanding) so every
 * screen that lists loans keeps working, plus what's new: the people on
 * it, the plan, pending payments and what this member can do next.
 */
function viewFor(userId, { agreement: a, parties, payments }, today) {
  const me = parties.find((p) => p.user_id === userId);
  const calc = computeAgreement(
    {
      principalMinor: a.principal_minor,
      rateBps: a.rate_bps,
      ratePeriod: a.rate_period,
      termMonths: a.term_months,
      firstDueDate: a.first_due_date,
      dueDay: a.due_day,
      dueDate: a.due_date,
      liability: a.liability,
      status: a.status,
    },
    parties.map((p) => ({ id: p.id, role: p.role, shareMinor: p.share_minor })),
    payments.map((p) => ({ id: p.id, payerPartyId: p.payer_party_id, payeePartyId: p.payee_party_id, amountMinor: p.amount_minor, status: p.status, paidOn: p.paid_on })),
    today,
  );
  const lent = me.role === 'lender';
  const joint = a.liability === 'joint';
  const mine = lent ? calc.lenders.find((l) => l.partyId === me.id) : calc.borrowers.find((b) => b.partyId === me.id);
  const others = parties.filter((p) => p.role !== me.role);
  const nameOf = new Map(parties.map((p) => [p.id, displayName(p)]));

  const borrowerById = new Map(calc.borrowers.map((b) => [b.partyId, b]));
  const lenderById = new Map(calc.lenders.map((l) => [l.partyId, l]));

  const principal = lent || !joint ? mine.shareMinor : calc.principalMinor;
  const interest = lent ? (calc.principalMinor > 0n ? (calc.interestMinor * mine.shareMinor) / calc.principalMinor : 0n) : joint ? calc.interestMinor : mine.interestMinor;
  const repaid = lent ? mine.receivedMinor : joint ? calc.paidMinor : mine.paidMinor;
  const counts = a.status === 'active';

  const relevant = (p) => {
    if (a.kind === 'external') return true;
    if (lent) return p.payee_party_id === me.id;
    return joint || p.payer_party_id === me.id || p.payee_party_id === me.id;
  };
  const paymentView = (p) => ({
    id: p.id,
    amountMinor: s(p.amount_minor),
    paidOn: p.paid_on,
    memo: p.memo,
    payer: nameOf.get(p.payer_party_id),
    payee: nameOf.get(p.payee_party_id),
    payerPartyId: p.payer_party_id,
    payeePartyId: p.payee_party_id,
  });

  return {
    id: a.id,
    source: 'agreement',
    kind: a.kind,
    direction: lent ? 'lent' : 'borrowed',
    counterparty: joinNames(others.map(displayName)),
    principalMinor: s(principal),
    interestMinor: s(interest),
    totalDueMinor: s(mine.totalDueMinor),
    repaidMinor: s(repaid),
    outstandingMinor: s(mine.outstandingMinor),
    positionMinor: s(counts ? (lent ? mine.outstandingMinor : mine.positionOweMinor) : 0n),
    status: calc.status,
    liability: a.liability,
    rateBps: a.rate_bps,
    ratePeriod: a.rate_period,
    termMonths: a.term_months,
    startDate: a.start_date,
    firstDueDate: a.first_due_date,
    dueDay: a.due_day,
    dueDate: calc.finalDueDate,
    terms: a.terms,
    notes: a.notes,
    myRole: me.role,
    myPartyId: me.id,
    createdByMe: a.created_by === userId,
    needsMyAnswer: a.status === 'proposed' && !me.accepted_at && !me.declined_at,
    loanTotals: { principalMinor: s(calc.principalMinor), interestMinor: s(calc.interestMinor), totalDueMinor: s(calc.totalDueMinor), paidMinor: s(calc.paidMinor), outstandingMinor: s(calc.outstandingMinor) },
    plan: lent
      ? null
      : { behindMinor: s(mine.behindMinor), dueToDateMinor: s(mine.dueToDateMinor), next: mine.next ? { dueDate: mine.next.dueDate, amountMinor: s(mine.next.amountMinor) } : null, schedule: mine.schedule.map((i) => ({ dueDate: i.dueDate, amountMinor: s(i.amountMinor) })) },
    parties: parties.map((p) => {
      const b = borrowerById.get(p.id);
      const l = lenderById.get(p.id);
      return {
        id: p.id,
        name: displayName(p),
        role: p.role,
        isMe: p.id === me.id,
        external: !!p.external_name,
        shareMinor: s(p.share_minor),
        accepted: !!p.accepted_at || !!p.external_name,
        declined: !!p.declined_at,
        ...(b && { totalDueMinor: s(b.totalDueMinor), paidMinor: s(b.paidMinor), outstandingMinor: s(b.outstandingMinor), behindMinor: s(b.behindMinor) }),
        ...(l && { totalDueMinor: s(l.totalDueMinor), receivedMinor: s(l.receivedMinor), outstandingMinor: s(l.outstandingMinor) }),
      };
    }),
    repayments: payments.filter((p) => p.status === 'confirmed' && relevant(p)).map(paymentView),
    pendingPayments: payments
      .filter((p) => p.status === 'pending' && relevant(p))
      .map((p) => ({ ...paymentView(p), canConfirm: p.payee_party_id === me.id, canCancel: p.recorded_by === userId })),
  };
}

function legacyView(loan) {
  return { ...loan, source: 'legacy', kind: 'external', totalDueMinor: loan.principalMinor, interestMinor: '0', positionMinor: null, parties: [], pendingPayments: [], plan: null, needsMyAnswer: false };
}

/**
 * Every loan the member is on: agreements (except declined or cancelled
 * ones) and any older private loans not yet copied into agreements. Totals
 * count only loans everyone has accepted.
 */
export async function getLoansForUser(userId, today = todayInKampala()) {
  const legacy = await getLegacyLoansForUser(userId);
  let agreements = [];
  let migratedIds = new Set();
  try {
    const { rows: ids } = await query(
      `SELECT DISTINCT a.id FROM loan_agreements a JOIN loan_parties p ON p.agreement_id = a.id
       WHERE p.user_id = $1 AND a.status NOT IN ('declined', 'cancelled')`,
      [userId],
    );
    agreements = (await loadAgreements({ query }, ids.map((r) => r.id))).map((g) => viewFor(userId, g, today));
    const { rows: migrated } = await query('SELECT legacy_loan_id FROM loan_agreements WHERE legacy_loan_id IS NOT NULL');
    migratedIds = new Set(migrated.map((r) => r.legacy_loan_id));
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }

  const legacyLoans = legacy.loans.filter((l) => !migratedIds.has(l.id)).map(legacyView);
  let owedToYou = 0n;
  let youOwe = 0n;
  for (const l of legacyLoans) {
    if ((l.status === 'active' || l.status === 'overdue') && BigInt(l.outstandingMinor) > 0n) {
      if (l.direction === 'lent') owedToYou += BigInt(l.outstandingMinor);
      else youOwe += BigInt(l.outstandingMinor);
    }
  }
  for (const l of agreements) {
    const v = BigInt(l.positionMinor);
    if (v <= 0n) continue;
    if (l.direction === 'lent') owedToYou += v;
    else youOwe += v;
  }

  const order = (l) => (l.needsMyAnswer ? 0 : l.status === 'proposed' ? 1 : 2);
  const loans = [...agreements, ...legacyLoans].sort((x, y) => order(x) - order(y) || String(x.startDate ?? '').localeCompare(String(y.startDate ?? '')));
  return { loans, totals: { owedToYouMinor: owedToYou.toString(), youOweMinor: youOwe.toString() }, today };
}

// ── Changes ────────────────────────────────────────────────────────────

function toMinor(value, label) {
  if (typeof value !== 'string' && typeof value !== 'number') throw httpError(400, `${label} is required.`);
  if (!/^\d+$/.test(String(value))) throw httpError(400, `${label} must be a whole number.`);
  return BigInt(value);
}

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const cleanText = (v, max = 500) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Creates a loan. A loan between members starts as 'proposed', accepted by
 * its creator; it becomes active when everyone on it has accepted. A
 * private ledger loan (kind 'external') is active at once.
 */
export async function createAgreement(userId, body, today = todayInKampala()) {
  const kind = body?.kind;
  if (!['member', 'external'].includes(kind)) throw httpError(400, 'kind must be member or external.');
  if (!Array.isArray(body.parties)) throw httpError(400, 'parties is required.');

  const principalMinor = toMinor(body.principalMinor, 'The loan amount');
  const rateBps = body.rateBps == null ? 0 : Number(body.rateBps);
  const ratePeriod = body.ratePeriod ?? 'month';
  const termMonths = body.termMonths == null || body.termMonths === '' ? null : Number(body.termMonths);
  const firstDueDate = body.firstDueDate || null;
  const dueDay = body.dueDay == null || body.dueDay === '' ? null : Number(body.dueDay);
  const dueDate = body.dueDate || null;
  const startDate = body.startDate || today;
  if (!isDate(startDate)) throw httpError(400, 'The start date must be a date.');
  if (dueDate && !isDate(dueDate)) throw httpError(400, 'The due date must be a date.');
  if (firstDueDate && firstDueDate < startDate) throw httpError(400, 'The first payment can’t be before the loan starts.');

  const parties = body.parties.map((p) => ({
    username: typeof p?.username === 'string' ? p.username.trim().toLowerCase() : null,
    externalName: cleanText(p?.externalName, 80),
    role: p?.role,
    shareMinor: toMinor(p?.shareMinor, 'Each share'),
  }));
  if (parties.some((p) => !['lender', 'borrower'].includes(p.role))) throw httpError(400, 'Each person must be a lender or a borrower.');

  const borrowerCount = parties.filter((p) => p.role === 'borrower').length;
  const liability = borrowerCount > 1 ? body.liability : 'split';
  const shapeError = validateAgreementShape({
    principalMinor,
    rateBps,
    ratePeriod,
    termMonths,
    firstDueDate,
    dueDay,
    liability,
    lenders: parties.filter((p) => p.role === 'lender'),
    borrowers: parties.filter((p) => p.role === 'borrower'),
  });
  if (shapeError) throw httpError(400, shapeError);

  return withTransaction(async (client) => {
    const { rows: [creator] } = await client.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    const resolved = [];
    if (kind === 'external') {
      const mineRows = parties.filter((p) => p.username);
      const outside = parties.filter((p) => p.externalName && !p.username);
      if (parties.length !== 2 || mineRows.length !== 1 || outside.length !== 1 || mineRows[0].username !== creator.username || mineRows[0].role === outside[0].role) {
        throw httpError(400, 'A loan with someone outside Nomad is between you and one other person, named.');
      }
      resolved.push({ ...mineRows[0], userId }, { ...outside[0], userId: null });
    } else {
      if (parties.some((p) => !p.username || p.externalName)) throw httpError(400, 'Everyone on a loan between members must be a Nomad member.');
      const usernames = parties.map((p) => p.username);
      if (new Set(usernames).size !== usernames.length) throw httpError(400, 'Each member can only appear once on a loan.');
      if (!usernames.includes(creator.username)) throw httpError(400, 'You must be one of the lenders or borrowers.');
      const { rows: users } = await client.query('SELECT id, username FROM users WHERE username = ANY($1)', [usernames]);
      const idOf = new Map(users.map((u) => [u.username, u.id]));
      const unknown = usernames.filter((u) => !idOf.has(u));
      if (unknown.length) throw httpError(400, `No Nomad member with the username ${unknown.join(', ')}.`);
      for (const p of parties) resolved.push({ ...p, userId: idOf.get(p.username) });

      const { rows: [{ open }] } = await client.query(`SELECT count(*)::int AS open FROM loan_agreements WHERE created_by = $1 AND status = 'proposed'`, [userId]);
      if (open >= OPEN_PROPOSALS_LIMIT) throw httpError(429, 'You have too many loans waiting for answers. Cancel some first.');
    }

    const { rows: [agreement] } = await client.query(
      `INSERT INTO loan_agreements (kind, created_by, liability, principal_minor, rate_bps, rate_period, term_months, start_date, first_due_date, due_day, due_date, status, terms, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [kind, userId, liability, principalMinor.toString(), rateBps, ratePeriod, termMonths, startDate, firstDueDate, dueDay, dueDate, kind === 'external' ? 'active' : 'proposed', cleanText(body.terms), cleanText(body.notes)],
    );
    for (const p of resolved) {
      await client.query(
        `INSERT INTO loan_parties (agreement_id, user_id, external_name, role, share_minor, accepted_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [agreement.id, p.userId, p.userId ? null : p.externalName, p.role, p.shareMinor.toString(), p.userId === userId ? new Date() : null],
      );
    }
    return { id: agreement.id };
  });
}

async function lockAgreementForMember(client, agreementId, userId) {
  if (typeof agreementId !== 'string' || !/^[0-9a-f-]{36}$/i.test(agreementId)) throw httpError(404, 'Loan not found.');
  const { rows: [agreement] } = await client.query(`SELECT ${AGREEMENT_COLUMNS} FROM loan_agreements a WHERE a.id = $1 FOR UPDATE`, [agreementId]);
  if (!agreement) throw httpError(404, 'Loan not found.');
  const { rows: parties } = await client.query('SELECT * FROM loan_parties WHERE agreement_id = $1', [agreementId]);
  const me = parties.find((p) => p.user_id === userId);
  if (!me) throw httpError(404, 'Loan not found.');
  return { agreement, parties, me };
}

/** A member's answer to a proposed loan. The loan goes live when the last person accepts; one decline ends it. */
export async function answerAgreement(userId, { agreementId, answer }) {
  if (!['accept', 'decline'].includes(answer)) throw httpError(400, 'answer must be accept or decline.');
  return withTransaction(async (client) => {
    const { agreement, parties, me } = await lockAgreementForMember(client, agreementId, userId);
    if (agreement.status !== 'proposed') throw httpError(409, 'This loan is no longer waiting for answers.');
    if (me.accepted_at || me.declined_at) throw httpError(409, 'You have already answered.');
    if (answer === 'decline') {
      await client.query('UPDATE loan_parties SET declined_at = now() WHERE id = $1', [me.id]);
      await client.query(`UPDATE loan_agreements SET status = 'declined', updated_at = now() WHERE id = $1`, [agreement.id]);
      return { status: 'declined' };
    }
    await client.query('UPDATE loan_parties SET accepted_at = now() WHERE id = $1', [me.id]);
    const allAccepted = parties.every((p) => p.id === me.id || p.accepted_at || !p.user_id);
    if (allAccepted) await client.query(`UPDATE loan_agreements SET status = 'active', updated_at = now() WHERE id = $1`, [agreement.id]);
    return { status: allAccepted ? 'active' : 'proposed' };
  });
}

/** The creator withdraws a loan nobody has finished answering, or removes a private ledger loan with no payments on it. */
export async function cancelAgreement(userId, { agreementId }) {
  return withTransaction(async (client) => {
    const { agreement } = await lockAgreementForMember(client, agreementId, userId);
    if (agreement.created_by !== userId) throw httpError(403, 'Only the person who set up this loan can cancel it.');
    if (agreement.kind === 'member' && agreement.status !== 'proposed') throw httpError(409, 'Only a loan still waiting for answers can be cancelled.');
    if (agreement.kind === 'external') {
      const { rows: [{ n }] } = await client.query(`SELECT count(*)::int AS n FROM loan_payments WHERE agreement_id = $1 AND status = 'confirmed'`, [agreement.id]);
      if (n > 0) throw httpError(409, 'This loan has payments recorded, so it can’t be removed.');
    }
    await client.query(`UPDATE loan_agreements SET status = 'cancelled', updated_at = now() WHERE id = $1`, [agreement.id]);
    return { status: 'cancelled' };
  });
}

/** What's still owed on the part of the loan a payment from `payerPartyId` goes toward. */
async function outstandingFor(client, agreement, parties, payerPartyId) {
  const { rows: payments } = await client.query(`SELECT payer_party_id, payee_party_id, amount_minor, status FROM loan_payments WHERE agreement_id = $1`, [agreement.id]);
  const calc = computeAgreement(
    { principalMinor: agreement.principal_minor, rateBps: agreement.rate_bps, ratePeriod: agreement.rate_period, termMonths: agreement.term_months, firstDueDate: agreement.first_due_date, dueDay: agreement.due_day, dueDate: agreement.due_date, liability: agreement.liability, status: agreement.status },
    parties.map((p) => ({ id: p.id, role: p.role, shareMinor: p.share_minor })),
    payments.map((p) => ({ payerPartyId: p.payer_party_id, payeePartyId: p.payee_party_id, amountMinor: p.amount_minor, status: p.status })),
    todayInKampala(),
  );
  return calc.borrowers.find((b) => b.partyId === payerPartyId).outstandingMinor;
}

/**
 * Records money paid from a borrower to a lender. The receiver recording
 * it (or the owner of a private ledger) makes it count at once; the payer
 * recording it leaves it pending until the receiver confirms.
 */
export async function recordPayment(userId, body, today = todayInKampala()) {
  const amount = toMinor(body?.amountMinor, 'The amount');
  if (amount <= 0n || amount % 100n !== 0n) throw httpError(400, 'The amount must be a positive whole number of shillings.');
  const paidOn = body.paidOn || today;
  if (!isDate(paidOn)) throw httpError(400, 'The payment date must be a date.');
  if (paidOn > today) throw httpError(400, 'The payment date can’t be in the future.');
  // Scoped to the member, so one member's key can never match another's payment.
  const idempotencyKey = cleanText(body.idempotencyKey, 100) && `${userId}:${cleanText(body.idempotencyKey, 100)}`;

  return withTransaction(async (client) => {
    if (idempotencyKey) {
      const { rows } = await client.query('SELECT id, status FROM loan_payments WHERE idempotency_key = $1', [idempotencyKey]);
      if (rows[0]) return { id: rows[0].id, status: rows[0].status, duplicate: true };
    }
    const { agreement, parties, me } = await lockAgreementForMember(client, body.agreementId, userId);
    if (agreement.status !== 'active') throw httpError(409, 'Payments can only be recorded on a loan everyone has accepted.');
    if (paidOn < agreement.start_date) throw httpError(400, 'The payment date can’t be before the loan started.');

    const byId = new Map(parties.map((p) => [p.id, p]));
    const pick = (role, givenId) => {
      const candidates = parties.filter((p) => p.role === role);
      if (givenId) {
        const p = byId.get(givenId);
        if (!p || p.role !== role) throw httpError(400, `That isn’t a ${role} on this loan.`);
        return p;
      }
      if (candidates.length !== 1) throw httpError(400, `Choose which ${role} this payment is for.`);
      return candidates[0];
    };

    let payer;
    let payee;
    if (agreement.kind === 'external') {
      payer = pick('borrower', body.payerPartyId);
      payee = pick('lender', body.payeePartyId);
    } else if (me.role === 'borrower') {
      payer = me;
      payee = pick('lender', body.payeePartyId);
    } else {
      payee = me;
      payer = pick('borrower', body.payerPartyId);
    }

    const outstanding = await outstandingFor(client, agreement, parties, payer.id);
    if (amount > outstanding) throw httpError(400, `That’s more than the ${shillings(outstanding)} still owed.`);

    const confirmed = agreement.kind === 'external' || payee.user_id === userId;
    const { rows: [payment] } = await client.query(
      `INSERT INTO loan_payments (agreement_id, payer_party_id, payee_party_id, amount_minor, paid_on, memo, recorded_by, status, decided_by, decided_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, status`,
      [agreement.id, payer.id, payee.id, amount.toString(), paidOn, cleanText(body.memo, 200), userId, confirmed ? 'confirmed' : 'pending', confirmed ? userId : null, confirmed ? new Date() : null, idempotencyKey],
    );
    return payment;
  });
}

/** The receiver confirms or rejects a payment the payer recorded. */
export async function decidePayment(userId, { paymentId, decision }) {
  if (!['confirm', 'reject'].includes(decision)) throw httpError(400, 'decision must be confirm or reject.');
  if (typeof paymentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(paymentId)) throw httpError(404, 'Payment not found.');
  return withTransaction(async (client) => {
    const { rows: [found] } = await client.query('SELECT agreement_id FROM loan_payments WHERE id = $1', [paymentId]);
    if (!found) throw httpError(404, 'Payment not found.');
    const { agreement, parties, me } = await lockAgreementForMember(client, found.agreement_id, userId);
    const { rows: [payment] } = await client.query('SELECT * FROM loan_payments WHERE id = $1 FOR UPDATE', [paymentId]);
    if (payment.payee_party_id !== me.id) throw httpError(403, 'Only the person who received this payment can confirm it.');
    if (payment.status !== 'pending') throw httpError(409, 'This payment has already been answered.');
    if (decision === 'confirm') {
      const outstanding = await outstandingFor(client, agreement, parties, payment.payer_party_id);
      if (BigInt(payment.amount_minor) > outstanding) throw httpError(409, 'Confirming this would take the loan past what’s owed. Reject it and ask for the right amount to be recorded.');
    }
    const status = decision === 'confirm' ? 'confirmed' : 'rejected';
    await client.query('UPDATE loan_payments SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1', [paymentId, status, userId]);
    return { status };
  });
}

/** Whoever recorded a payment can withdraw it while it's still pending. */
export async function cancelPayment(userId, { paymentId }) {
  if (typeof paymentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(paymentId)) throw httpError(404, 'Payment not found.');
  return withTransaction(async (client) => {
    const { rows: [payment] } = await client.query('SELECT * FROM loan_payments WHERE id = $1 FOR UPDATE', [paymentId]);
    if (!payment || payment.recorded_by !== userId) throw httpError(404, 'Payment not found.');
    if (payment.status !== 'pending') throw httpError(409, 'Only a payment still waiting for confirmation can be withdrawn.');
    await client.query(`UPDATE loan_payments SET status = 'cancelled', decided_by = $2, decided_at = now() WHERE id = $1`, [paymentId, userId]);
    return { status: 'cancelled' };
  });
}

/**
 * Admin only: copies the older private loans (and their repayments) into
 * private-ledger agreements, one each, skipping any already copied. The
 * outside person becomes the other party; repayments keep their dates,
 * memos and idempotency.
 */
export async function migrateLegacyLoans() {
  return withTransaction(async (client) => {
    const { rows: loans } = await client.query(
      `SELECT l.*, l.start_date::text AS start_text, l.due_date::text AS due_text, l.created_at::date::text AS created_text
       FROM loans l WHERE NOT EXISTS (SELECT 1 FROM loan_agreements a WHERE a.legacy_loan_id = l.id)`,
    );
    let migrated = 0;
    let repayments = 0;
    for (const l of loans) {
      const status = l.status === 'written_off' ? 'written_off' : 'active';
      const { rows: [a] } = await client.query(
        `INSERT INTO loan_agreements (kind, created_by, liability, principal_minor, rate_bps, rate_period, term_months, start_date, due_date, status, terms, notes, legacy_loan_id, created_at)
         VALUES ('external', $1, 'split', $2, 0, 'month', NULL, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [l.user_id, l.principal_minor, l.start_text ?? l.created_text, l.due_text, status, l.terms, [l.loan_ref, l.notes].filter(Boolean).join(' · ') || null, l.id, l.created_at],
      );
      const memberRole = l.direction === 'lent' ? 'lender' : 'borrower';
      const otherRole = memberRole === 'lender' ? 'borrower' : 'lender';
      const { rows: [mine] } = await client.query(
        `INSERT INTO loan_parties (agreement_id, user_id, role, share_minor, accepted_at) VALUES ($1,$2,$3,$4,now()) RETURNING id`,
        [a.id, l.user_id, memberRole, l.principal_minor],
      );
      const { rows: [other] } = await client.query(
        `INSERT INTO loan_parties (agreement_id, external_name, role, share_minor) VALUES ($1,$2,$3,$4) RETURNING id`,
        [a.id, l.counterparty, otherRole, l.principal_minor],
      );
      const payer = memberRole === 'borrower' ? mine.id : other.id;
      const payee = memberRole === 'lender' ? mine.id : other.id;
      const { rows: reps } = await client.query('SELECT *, paid_on::text AS paid_text FROM loan_repayments WHERE loan_id = $1 ORDER BY paid_on, created_at', [l.id]);
      for (const r of reps) {
        await client.query(
          `INSERT INTO loan_payments (agreement_id, payer_party_id, payee_party_id, amount_minor, paid_on, memo, recorded_by, status, decided_at, idempotency_key, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,NULL,'confirmed',now(),$7,$8)`,
          [a.id, payer, payee, r.amount_minor, r.paid_text, r.memo, r.idempotency_key ? `legacy:${r.idempotency_key}` : `legacy:${r.id}`, r.created_at],
        );
        repayments += 1;
      }
      migrated += 1;
    }
    return { migrated, repayments };
  });
}
