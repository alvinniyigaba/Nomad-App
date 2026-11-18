import crypto from 'crypto';
import { query, withTransaction } from './db.js';
import { getLoansForUser, recordPayment } from './loanAgreements.js';
import { SOURCE, planCosts, planIncome, planRepayments, compareContributions, validatePayload } from './moneyLinkPlan.js';

// The Nomad Money phone app talks to Nomad through api/journey.js?resource=money
// (no new Serverless Function — the Hobby plan's 12 are all used). It signs in
// with a device token, not a session: a long random secret shown once when an
// admin links the phone (scripts/link-money-device.sh), stored here only as a
// SHA-256 hash, and able to read/write that one member's own figures only.

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function newDeviceToken() {
  return 'nm_' + crypto.randomBytes(32).toString('base64url');
}

/** Resolves the device + member from "Authorization: Bearer nm_…", or null. */
export async function deviceFromRequest(req) {
  const m = /^Bearer (nm_[A-Za-z0-9_-]{20,})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const { rows } = await query(
    `SELECT d.id AS device_id, d.user_id, u.username FROM money_devices d JOIN users u ON u.id = d.user_id
     WHERE d.token_hash = $1 AND d.revoked_at IS NULL`, [hash(m[1])]);
  if (!rows[0]) return null;
  await query('UPDATE money_devices SET last_seen_at = now() WHERE id = $1', [rows[0].device_id]);
  return rows[0];
}

export async function createDevice(userId, label) {
  const token = newDeviceToken();
  const { rows } = await query('INSERT INTO money_devices (user_id, token_hash, label) VALUES ($1,$2,$3) RETURNING id, created_at',
    [userId, hash(token), label || 'Nomad Money']);
  return { id: rows[0].id, token, createdAt: rows[0].created_at };
}

// Accounts the member owns or belongs to (group goals), with this member's own net entries.
async function memberAccounts(userId) {
  const { rows } = await query(
    `SELECT a.id, a.name, a.kind, a.is_group,
            COALESCE((SELECT SUM(amount_minor) FROM ledger_entries e WHERE e.account_id = a.id AND e.user_id = $1), 0)::text AS mine_minor
     FROM accounts a
     WHERE a.closed_at IS NULL AND (a.user_id = $1 OR EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = $1))
     ORDER BY a.created_at`, [userId]);
  return rows;
}

async function currentFigures(userId) {
  const [e, i] = await Promise.all([
    query(`SELECT DISTINCT ON (category) category, amount_minor::text AS amount_minor, source FROM member_expenses WHERE user_id = $1
           ORDER BY category, effective_from DESC, created_at DESC`, [userId]),
    query(`SELECT DISTINCT ON (label) label, kind, amount_minor::text AS amount_minor, source FROM member_income WHERE user_id = $1
           ORDER BY label, effective_from DESC, created_at DESC`, [userId]),
  ]);
  return {
    costs: Object.fromEntries(e.rows.map((r) => [r.category, r.amount_minor])),
    income: Object.fromEntries(i.rows.map((r) => [r.label, { kind: r.kind, amountMinor: r.amount_minor }])),
  };
}

// The member's loans (agreements + any older loans not yet copied), each with
// this member's repayment route. Before the loan tables exist, routes are all 'app'.
async function loansWithRoutes(userId) {
  const { loans, totals } = await getLoansForUser(userId);
  let routes = new Map();
  try {
    const { rows } = await query('SELECT id, repayment_route FROM loan_parties WHERE user_id = $1', [userId]);
    routes = new Map(rows.map((r) => [r.id, r.repayment_route]));
  } catch (err) {
    if (!['42P01', '42703'].includes(err.code)) throw err;
  }
  return { totals, loans: loans.map((l) => ({ ...l, route: (l.myPartyId && routes.get(l.myPartyId)) || 'app' })) };
}

async function postedFromPhone(userId) {
  try {
    const { rows } = await query(
      `SELECT idempotency_key, agreement_id, amount_minor::text AS amount_minor, status FROM loan_payments
       WHERE idempotency_key LIKE $1`, [`${userId}:nm:%`]);
    return rows.map((r) => ({ key: r.idempotency_key.slice(userId.length + 1), agreementId: r.agreement_id, amountMinor: r.amount_minor, status: r.status }));
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

/** The member chooses, per loan, whether the phone records their payments on it. */
export async function setRoute(member, { agreementId, route }) {
  if (!['app', 'nomad_money'].includes(route)) return { status: 400, body: { error: 'route must be app or nomad_money' } };
  const { rowCount } = await query('UPDATE loan_parties SET repayment_route = $3 WHERE agreement_id = $1 AND user_id = $2', [agreementId, member.user_id, route]);
  return rowCount ? { status: 200, body: { ok: true, agreementId, route } } : { status: 404, body: { error: 'You are not on that loan' } };
}

/** What the phone caches for offline use: accounts, loans, figures on record. */
export async function snapshot(member) {
  const [accounts, loans, figures] = await Promise.all([
    memberAccounts(member.user_id), loansWithRoutes(member.user_id), currentFigures(member.user_id),
  ]);
  return {
    username: member.username,
    serverTime: new Date().toISOString(),
    accounts: accounts.map((a) => ({ name: a.name, kind: a.kind, isGroup: a.is_group, myEntriesMinor: a.mine_minor })),
    loans: loans.loans.map((l) => ({
      id: l.id, source: l.source, kind: l.kind, direction: l.direction, counterparty: l.counterparty,
      status: l.status, outstandingMinor: l.outstandingMinor, totalDueMinor: l.totalDueMinor, route: l.route,
      pendingPayments: (l.pendingPayments || []).length,
    })),
    loanTotals: loans.totals,
    costsOnRecord: figures.costs,
    incomeOnRecord: figures.income,
  };
}

/** Plan (preview) or plan-and-write (commit) one sync from the phone. */
export async function sync(member, payload) {
  const problems = validatePayload(payload);
  if (problems.length) return { status: 400, body: { error: 'Invalid payload', problems } };

  const [figures, accounts, loans, posted] = await Promise.all([
    currentFigures(member.user_id), memberAccounts(member.user_id), loansWithRoutes(member.user_id), postedFromPhone(member.user_id),
  ]);
  const costs = planCosts(payload.costs || {}, figures.costs, payload.asOf);
  const income = planIncome(payload.income || [], figures.income, payload.asOf);
  const repayments = planRepayments(payload.repayments || [], posted, loans.loans);
  const contributions = compareContributions(payload.contributions || [],
    accounts.map((a) => ({ account: a.name, amountMinor: a.mine_minor })), accounts.map((a) => a.name));

  const plan = { costs, income, repayments, contributions };
  const writes = costs.rows.length + income.rows.length + repayments.inserts.length;
  if (payload.mode === 'preview' || writes === 0) {
    return { status: 200, body: { mode: payload.mode, written: false, writes, plan } };
  }

  if (costs.rows.length + income.rows.length) await withTransaction(async (c) => {
    for (const r of costs.rows) {
      await c.query('INSERT INTO member_expenses (user_id, category, amount_minor, frequency, effective_from, source) VALUES ($1,$2,$3,$4,$5,$6)',
        [member.user_id, r.category, r.amountMinor, r.frequency, r.effectiveFrom, SOURCE]);
    }
    for (const r of income.rows) {
      await c.query('INSERT INTO member_income (user_id, kind, label, amount_minor, frequency, effective_from, source) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [member.user_id, r.kind, r.label, r.amountMinor, r.frequency, r.effectiveFrom, SOURCE]);
    }
  });
  // Payments go through the Nomad App's own path (its checks, confirm step and
  // idempotency), one at a time; a refusal is reported, not fatal. Safe to resend.
  const recorded = [];
  for (const r of repayments.inserts) {
    try {
      const out = await recordPayment(member.user_id, { agreementId: r.agreementId, amountMinor: r.amountMinor, paidOn: r.paidOn, memo: r.memo, idempotencyKey: r.key });
      recorded.push({ key: r.key, counterparty: r.counterparty, status: out.status });
    } catch (err) {
      if (!err.status) throw err;
      repayments.skipped.push({ key: r.key, reason: `${r.counterparty}: ${err.message}` });
    }
  }
  await query('INSERT INTO money_sync_log (user_id, device_id, writes, summary) VALUES ($1,$2,$3,$4)',
    [member.user_id, member.device_id, writes, JSON.stringify({ costs: costs.rows.length, income: income.rows.length, payments: recorded, asOf: payload.asOf })]);
  return { status: 200, body: { mode: 'commit', written: true, writes, recorded, plan } };
}

// The phone app's web view runs on https://localhost (Android) or capacitor://localhost (iOS).
const PHONE_ORIGINS = new Set(['https://localhost', 'capacitor://localhost', 'http://localhost:5173', 'http://localhost:4173']);
export function phoneCors(req, res) {
  const o = req.headers.origin;
  if (o && PHONE_ORIGINS.has(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}
