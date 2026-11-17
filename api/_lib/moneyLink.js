import crypto from 'crypto';
import { query, withTransaction } from './db.js';
import { getLoansForUser } from './loans.js';
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

async function loanRoutes(userId) {
  const { rows } = await query('SELECT loan_ref, repayment_route FROM loans WHERE user_id = $1', [userId]);
  return rows.map((r) => ({ loanRef: r.loan_ref, route: r.repayment_route }));
}

/** What the phone caches for offline use: accounts, loans, figures on record. */
export async function snapshot(member) {
  const [accounts, loans, routes, figures] = await Promise.all([
    memberAccounts(member.user_id), getLoansForUser(member.user_id), loanRoutes(member.user_id), currentFigures(member.user_id),
  ]);
  const route = Object.fromEntries(routes.map((r) => [r.loanRef, r.route]));
  return {
    username: member.username,
    serverTime: new Date().toISOString(),
    accounts: accounts.map((a) => ({ name: a.name, kind: a.kind, isGroup: a.is_group, myEntriesMinor: a.mine_minor })),
    loans: loans.loans.map((l) => ({ ...l, repayments: undefined, route: route[l.loanRef] || 'sheet' })),
    loanTotals: loans.totals,
    costsOnRecord: figures.costs,
    incomeOnRecord: figures.income,
  };
}

/** Plan (preview) or plan-and-write (commit) one sync from the phone. */
export async function sync(member, payload) {
  const problems = validatePayload(payload);
  if (problems.length) return { status: 400, body: { error: 'Invalid payload', problems } };

  const [figures, accounts, routes, posted] = await Promise.all([
    currentFigures(member.user_id), memberAccounts(member.user_id), loanRoutes(member.user_id),
    query(`SELECT r.idempotency_key, r.amount_minor::text AS amount_minor, l.loan_ref FROM loan_repayments r JOIN loans l ON l.id = r.loan_id
           WHERE l.user_id = $1 AND r.idempotency_key LIKE 'nm:%'`, [member.user_id]),
  ]);
  const costs = planCosts(payload.costs || {}, figures.costs, payload.asOf);
  const income = planIncome(payload.income || [], figures.income, payload.asOf);
  const repayments = planRepayments(payload.repayments || [],
    posted.rows.map((r) => ({ idempotencyKey: r.idempotency_key, loanRef: r.loan_ref, amountMinor: r.amount_minor })), routes);
  const contributions = compareContributions(payload.contributions || [],
    accounts.map((a) => ({ account: a.name, amountMinor: a.mine_minor })), accounts.map((a) => a.name));

  const plan = { costs, income, repayments, contributions };
  const writes = costs.rows.length + income.rows.length + repayments.inserts.length;
  if (payload.mode === 'preview' || writes === 0) {
    return { status: 200, body: { mode: payload.mode, written: false, writes, plan } };
  }

  await withTransaction(async (c) => {
    for (const r of costs.rows) {
      await c.query('INSERT INTO member_expenses (user_id, category, amount_minor, frequency, effective_from, source) VALUES ($1,$2,$3,$4,$5,$6)',
        [member.user_id, r.category, r.amountMinor, r.frequency, r.effectiveFrom, SOURCE]);
    }
    for (const r of income.rows) {
      await c.query('INSERT INTO member_income (user_id, kind, label, amount_minor, frequency, effective_from, source) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [member.user_id, r.kind, r.label, r.amountMinor, r.frequency, r.effectiveFrom, SOURCE]);
    }
    for (const r of repayments.inserts) {
      await c.query(`INSERT INTO loan_repayments (loan_id, amount_minor, paid_on, memo, idempotency_key)
                     SELECT id, $3, $4, $5, $6 FROM loans WHERE user_id = $1 AND loan_ref = $2
                     ON CONFLICT (idempotency_key) DO NOTHING`,
        [member.user_id, r.loanRef, r.amountMinor, r.paidOn, r.memo, r.idempotencyKey]);
    }
    await c.query('INSERT INTO money_sync_log (user_id, device_id, writes, summary) VALUES ($1,$2,$3,$4)',
      [member.user_id, member.device_id, writes, JSON.stringify({ costs: costs.rows.length, income: income.rows.length, repayments: repayments.inserts.length, asOf: payload.asOf })]);
  });
  return { status: 200, body: { mode: 'commit', written: true, writes, plan } };
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
