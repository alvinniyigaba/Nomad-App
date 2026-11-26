// The admin console's side of api/admin/index.js: who is calling, the audit
// log every change is written to, and the read models the /admin screens
// are built from (one call per screen, to keep Neon compute low).
import { query } from './db.js';
import { getSession, requiresPin } from './auth.js';
import { getAccountMembers } from './access.js';
import { getContributionsByAccount } from './ledger.js';
import { getLoansForUser } from './loanAgreements.js';

export const STAFF_ROLES = ['fund_manager'];

// Days without a login before a member shows up as "quiet" on the overview.
const QUIET_DAYS = 30;

function isMissingSchema(err) {
  // 42P01 undefined_table, 42703 undefined_column: resource=migrate hasn't run yet.
  return err?.code === '42P01' || err?.code === '42703';
}

/**
 * The staff member behind a request, or null. A browser call only counts
 * when it carries X-Nomad-Admin: 1 — a header another site can't add to a
 * cross-site request — so a link or form elsewhere can't act with the
 * admin's cookie. Each staff request keeps the PIN fresh, so the 15-minute
 * PIN timeout means 15 minutes idle, not 15 minutes since sign-in.
 */
async function staffActor(req) {
  if (req.headers['x-nomad-admin'] !== '1') return null;
  const session = await getSession(req);
  if (!session || requiresPin(session)) return null;
  let role;
  try {
    const { rows } = await query('SELECT staff_role FROM users WHERE id = $1', [session.user_id]);
    role = rows[0]?.staff_role;
  } catch (err) {
    if (isMissingSchema(err)) return null;
    throw err;
  }
  if (!role) return null;
  await query('UPDATE sessions SET pin_verified_at = now() WHERE id = $1', [session.id]);
  return { kind: 'staff', userId: session.user_id, username: session.username, role };
}

/** Who may use the admin API: the ADMIN_TOKEN, Vercel Cron's CRON_SECRET, or a signed-in staff member. */
export async function authorizeAdmin(req) {
  if (process.env.ADMIN_TOKEN && req.query.token === process.env.ADMIN_TOKEN) return { kind: 'token' };
  const authHeader = req.headers.authorization || '';
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return { kind: 'cron' };
  return staffActor(req);
}

/** resource=whoami — answered before authorisation, so the sign-in screen knows what to ask for next. */
export async function whoami(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(200).json({ authenticated: false });
  if (requiresPin(session)) return res.status(200).json({ authenticated: true, requiresPin: true, username: session.username });
  const actor = await staffActor(req);
  return res.status(200).json({
    authenticated: true,
    requiresPin: false,
    username: session.username,
    name: `${session.name} ${session.surname}`.trim(),
    staff: actor ? { role: actor.role } : null,
  });
}

// Reads that change something, so they're logged like writes.
const LOGGED_GETS = new Set(['migrate', 'sync-sheet', 'sync-investments']);
const SECRET_KEYS = new Set(['password', 'pin', 'token']);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.has(k) ? '[redacted]' : redact(v)]));
  }
  return value;
}

/** Keeps a log row small: anything over ~8 KB is replaced by a note of its size. */
function compact(value) {
  if (value === undefined) return null;
  const text = JSON.stringify(redact(value));
  if (text.length <= 8000) return text;
  return JSON.stringify({ truncated: true, bytes: text.length });
}

/**
 * Runs one admin request and, when it changes something, writes who did
 * what to admin_audit_log before the answer goes out. The response is held
 * back until the row is written, so the log can't miss a change a caller
 * was told succeeded. Logging failures (e.g. before migrate has created the
 * table) never block the request itself.
 */
export async function withAudit(req, res, actor, dispatch) {
  const resource = String(req.query.resource ?? '');
  const shouldLog = req.method !== 'GET' || LOGGED_GETS.has(resource);
  if (!shouldLog) return dispatch();

  const sendJson = res.json.bind(res);
  let payload;
  let held = true;
  res.json = (obj) => {
    if (!held) return sendJson(obj);
    payload = obj;
    return res;
  };

  let thrown;
  try {
    await dispatch();
  } catch (err) {
    thrown = err;
  }
  held = false;

  const status = thrown ? 500 : res.statusCode || 200;
  const target = req.body?.username ?? req.query.username ?? null;
  const { token: _token, ...queryWithoutToken } = req.query;
  try {
    await query(
      `INSERT INTO admin_audit_log (actor_kind, actor_user_id, actor_username, resource, method, target_username, status, request, response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        actor.kind,
        actor.userId ?? null,
        actor.username ?? null,
        resource,
        req.method,
        typeof target === 'string' ? target.trim().toLowerCase() : null,
        status,
        compact({ query: queryWithoutToken, body: req.body }),
        compact(payload),
      ],
    );
  } catch (err) {
    console.error('[admin-audit] could not write log row', err);
  }

  if (thrown) throw thrown;
  if (payload !== undefined) return sendJson(payload);
}

/** resource=staff (POST { username, role|null }) — token only, so a staff login can't grant itself or others more. */
export async function handleStaff(req, res, actor) {
  if (actor.kind !== 'token') return res.status(403).json({ error: 'Granting admin access needs the admin token' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username, role } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim()) return res.status(400).json({ error: 'username is required' });
  if (role !== null && !STAFF_ROLES.includes(role)) return res.status(400).json({ error: `role must be null or one of ${STAFF_ROLES.join(', ')}` });
  const { rows } = await query('UPDATE users SET staff_role = $2 WHERE username = $1 RETURNING username, staff_role', [username.trim().toLowerCase(), role]);
  if (!rows[0]) return res.status(404).json({ error: 'No such user' });
  return res.status(200).json({ ok: true, username: rows[0].username, staffRole: rows[0].staff_role });
}

const s = (v) => (v == null ? null : String(v));

/**
 * One row per member, with the same split the member's own Home shows:
 * savings (liquid + goals + their own share of group goals), invested
 * (Nomad holdings at their latest snapshot + external holdings' balance),
 * and loans that everyone has accepted.
 */
async function memberRows() {
  const { rows } = await query(
    `SELECT u.id, u.username, u.name, u.surname, u.email, u.member_since_year, u.created_at,
       COALESCE((SELECT SUM(l.amount_minor) FROM ledger_entries l JOIN accounts a ON a.id = l.account_id
                 WHERE a.is_group = false AND a.user_id = u.id AND a.kind = 'liquid'), 0)::bigint AS liquid_minor,
       COALESCE((SELECT SUM(l.amount_minor) FROM ledger_entries l JOIN accounts a ON a.id = l.account_id
                 WHERE a.is_group = false AND a.user_id = u.id AND a.kind = 'goal'), 0)::bigint AS goals_minor,
       COALESCE((SELECT SUM(l.amount_minor) FROM ledger_entries l JOIN accounts a ON a.id = l.account_id
                 WHERE a.is_group = true AND l.user_id = u.id), 0)::bigint AS group_minor,
       COALESCE((SELECT SUM((SELECT sn.value_minor FROM investment_snapshots sn WHERE sn.holding_id = h.id ORDER BY sn.snapshot_date DESC LIMIT 1))
                 FROM external_holdings h WHERE h.user_id = u.id AND h.status = 'active' AND h.managed_by = 'nomad'), 0)::bigint AS nomad_invested_minor,
       COALESCE((SELECT SUM(h.balance_minor) FROM external_holdings h
                 WHERE h.user_id = u.id AND h.status = 'active' AND h.managed_by = 'external'), 0)::bigint AS external_invested_minor,
       (SELECT COUNT(*) FROM sessions se WHERE se.user_id = u.id)::int AS login_count,
       (SELECT MAX(se.created_at) FROM sessions se WHERE se.user_id = u.id) AS last_login,
       k.phone_verified, k.id_matched, k.selfie_done, k.source_of_funds_done
     FROM users u
     LEFT JOIN kyc_status k ON k.user_id = u.id
     ORDER BY u.name, u.surname`,
  );
  return rows;
}

function loanFlags(loans) {
  let waiting = 0;
  let behind = 0;
  let overdue = 0;
  for (const l of loans) {
    if (l.needsMyAnswer) waiting++;
    if (l.pendingPayments?.some((p) => p.canConfirm)) waiting++;
    if (l.status === 'overdue') overdue++;
    else if (l.plan && BigInt(l.plan.behindMinor ?? 0) > 0n) behind++;
  }
  return { waiting, behind, overdue };
}

/** What deserves a look for one member — the overview's "Needs attention" list. */
function attentionFor(m, loans) {
  const items = [];
  const kycDone = [m.phone_verified, m.id_matched, m.selfie_done, m.source_of_funds_done].filter(Boolean).length;
  if (!m.last_login) items.push({ kind: 'never-logged-in', text: 'Has never signed in' });
  else if (Date.now() - new Date(m.last_login).getTime() > QUIET_DAYS * 86400000) {
    items.push({ kind: 'quiet', text: `No sign-in for ${Math.floor((Date.now() - new Date(m.last_login).getTime()) / 86400000)} days` });
  }
  if (m.phone_verified != null && kycDone < 4) items.push({ kind: 'kyc', text: `KYC ${kycDone} of 4 steps done` });
  if (loans.overdue) items.push({ kind: 'loan-overdue', text: `${loans.overdue} loan${loans.overdue > 1 ? 's' : ''} overdue` });
  if (loans.behind) items.push({ kind: 'loan-behind', text: `Behind on ${loans.behind} repayment plan${loans.behind > 1 ? 's' : ''}` });
  if (loans.waiting) items.push({ kind: 'loan-waiting', text: `${loans.waiting} loan action${loans.waiting > 1 ? 's' : ''} waiting on them` });
  return items;
}

/** resource=overview — every member's position and flags, fund totals, and the latest ledger activity. */
export async function handleOverview(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rows = await memberRows();

  const loansByUser = new Map(
    await Promise.all(rows.map(async (m) => [m.id, await getLoansForUser(m.id)])),
  );
  let staffUserIds = new Set();
  try {
    const { rows: staff } = await query('SELECT id FROM users WHERE staff_role IS NOT NULL');
    staffUserIds = new Set(staff.map((r) => r.id));
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }

  const totals = { savingsMinor: 0n, nomadInvestedMinor: 0n, externalInvestedMinor: 0n, owedToMembersMinor: 0n, owedByMembersMinor: 0n };
  const members = rows.map((m) => {
    const loanData = loansByUser.get(m.id);
    const savings = BigInt(m.liquid_minor) + BigInt(m.goals_minor) + BigInt(m.group_minor);
    const nomad = BigInt(m.nomad_invested_minor);
    const external = BigInt(m.external_invested_minor);
    const owedToYou = BigInt(loanData.totals.owedToYouMinor);
    const youOwe = BigInt(loanData.totals.youOweMinor);
    totals.savingsMinor += savings;
    totals.nomadInvestedMinor += nomad;
    totals.externalInvestedMinor += external;
    totals.owedToMembersMinor += owedToYou;
    totals.owedByMembersMinor += youOwe;
    const flags = loanFlags(loanData.loans);
    return {
      username: m.username,
      name: m.name,
      surname: m.surname,
      email: m.email,
      memberSince: m.member_since_year,
      isStaff: staffUserIds.has(m.id),
      savingsMinor: s(savings),
      liquidMinor: s(m.liquid_minor),
      goalsMinor: s(m.goals_minor),
      groupMinor: s(m.group_minor),
      investedMinor: s(nomad + external),
      nomadInvestedMinor: s(nomad),
      externalInvestedMinor: s(external),
      owedToYouMinor: s(owedToYou),
      youOweMinor: s(youOwe),
      netWorthMinor: s(savings + nomad + external + owedToYou - youOwe),
      openLoans: loanData.loans.filter((l) => l.status === 'active' || l.status === 'overdue' || l.status === 'proposed').length,
      loginCount: m.login_count,
      lastLogin: m.last_login,
      kycStepsDone: [m.phone_verified, m.id_matched, m.selfie_done, m.source_of_funds_done].filter(Boolean).length,
      attention: attentionFor(m, flags),
    };
  });

  const { rows: recent } = await query(
    `SELECT l.id, l.amount_minor, l.kind, l.memo, l.created_at, a.name AS account_name, a.is_group, u.username, u.name, u.surname
     FROM ledger_entries l JOIN accounts a ON a.id = l.account_id JOIN users u ON u.id = l.user_id
     ORDER BY l.created_at DESC LIMIT 15`,
  );

  return res.status(200).json({
    totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, s(v)])),
    memberCount: members.length,
    activeLast30Days: members.filter((m) => m.lastLogin && Date.now() - new Date(m.lastLogin).getTime() <= QUIET_DAYS * 86400000).length,
    members,
    recentEntries: recent.map((e) => ({
      id: e.id,
      amountMinor: s(e.amount_minor),
      kind: e.kind,
      memo: e.memo,
      createdAt: e.created_at,
      accountName: e.account_name,
      isGroup: e.is_group,
      username: e.username,
      memberName: `${e.name} ${e.surname}`.trim(),
    })),
  });
}

async function accountsFor(userId) {
  const { rows } = await query(
    `SELECT a.id, a.kind, a.name, a.is_group, a.closed_at, a.created_at, a.target_minor, a.target_date, a.pledged_minor,
            COALESCE(SUM(l.amount_minor), 0)::bigint AS balance_minor
     FROM accounts a
     LEFT JOIN ledger_entries l ON l.account_id = a.id
     WHERE (a.is_group = false AND a.user_id = $1)
        OR (a.is_group = true AND EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = $1))
     GROUP BY a.id
     ORDER BY a.closed_at NULLS FIRST, a.is_group ASC, a.kind DESC, a.created_at ASC`,
    [userId],
  );
  return Promise.all(
    rows.map(async (a) => {
      const { rows: entries } = await query(
        `SELECT l.id, l.amount_minor, l.kind, l.memo, l.created_at, u.username
         FROM ledger_entries l JOIN users u ON u.id = l.user_id
         WHERE l.account_id = $1 ORDER BY l.created_at DESC LIMIT 10`,
        [a.id],
      );
      const base = {
        id: a.id,
        kind: a.kind,
        name: a.name,
        isGroup: a.is_group,
        closedAt: a.closed_at,
        createdAt: a.created_at,
        targetMinor: s(a.target_minor),
        targetDate: a.target_date,
        balanceMinor: s(a.balance_minor),
        entries: entries.map((e) => ({ id: e.id, amountMinor: s(e.amount_minor), kind: e.kind, memo: e.memo, createdAt: e.created_at, username: e.username })),
      };
      if (!a.is_group) return base;
      const [members, contributions] = await Promise.all([getAccountMembers(a.id), getContributionsByAccount(a.id)]);
      return {
        ...base,
        members: members.map((m) => ({ username: m.username, role: m.role, contributionMinor: s(contributions[m.userId] ?? 0n) })),
        myShareMinor: s(contributions[userId] ?? 0n),
      };
    }),
  );
}

async function holdingsFor(userId) {
  const { rows } = await query('SELECT * FROM external_holdings WHERE user_id = $1 ORDER BY status, created_at', [userId]);
  return Promise.all(
    rows.map(async (h) => {
      const { rows: snaps } = await query(
        'SELECT value_minor, snapshot_date FROM investment_snapshots WHERE holding_id = $1 ORDER BY snapshot_date DESC LIMIT 12',
        [h.id],
      );
      const latest = snaps[0];
      return {
        id: h.id,
        providerName: h.provider_name,
        productType: h.product_type,
        managedBy: h.managed_by,
        status: h.status,
        sector: h.sector ?? null,
        currency: h.investment_currency,
        interestRateBps: h.interest_rate_bps,
        termMonths: h.term_months,
        maturityDate: h.maturity_date,
        startDate: h.start_date,
        investedMinor: s(h.invested_minor),
        balanceMinor: s(h.balance_minor),
        notes: h.notes,
        valueMinor: h.managed_by === 'nomad' ? s(latest?.value_minor) : s(h.balance_minor),
        valueDate: h.managed_by === 'nomad' ? (latest?.snapshot_date ?? null) : h.updated_at,
        snapshots: snaps.map((sn) => ({ valueMinor: s(sn.value_minor), date: sn.snapshot_date })),
        updatedAt: h.updated_at,
      };
    }),
  );
}

async function optional(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isMissingSchema(err)) return fallback;
    throw err;
  }
}

/** resource=member (GET ?username) — everything on record for one member, for the member page. */
export async function handleMember(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const username = String(req.query.username ?? '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username is required' });
  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
  const u = rows[0];
  if (!u) return res.status(404).json({ error: 'No such user' });

  const [accounts, holdings, loans, kyc, logins, expenses, income, placements, devices, audit] = await Promise.all([
    accountsFor(u.id),
    holdingsFor(u.id),
    getLoansForUser(u.id),
    query('SELECT phone_verified, id_matched, selfie_done, source_of_funds_done, updated_at FROM kyc_status WHERE user_id = $1', [u.id]).then((r) => r.rows[0] ?? null),
    query(
      `SELECT COUNT(*)::int AS login_count, COUNT(pin_verified_at)::int AS full_sessions, MIN(created_at) AS first_login, MAX(created_at) AS last_login,
              COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now())::int AS active_sessions
       FROM sessions WHERE user_id = $1`,
      [u.id],
    ).then((r) => r.rows[0]),
    optional(() => query('SELECT category, amount_minor, frequency, effective_from, created_at FROM member_expenses WHERE user_id = $1 ORDER BY effective_from DESC, created_at DESC', [u.id]).then((r) => r.rows), []),
    optional(() => query('SELECT label, kind, amount_minor, frequency, effective_from, created_at FROM member_income WHERE user_id = $1 ORDER BY effective_from DESC, created_at DESC', [u.id]).then((r) => r.rows), []),
    optional(() => query('SELECT archetype, note, created_at FROM archetype_placements WHERE user_id = $1 ORDER BY created_at DESC', [u.id]).then((r) => r.rows), []),
    optional(() => query('SELECT id, label, created_at, last_seen_at, revoked_at FROM money_devices WHERE user_id = $1 ORDER BY created_at DESC', [u.id]).then((r) => r.rows), []),
    optional(() => query('SELECT id, actor_kind, actor_username, resource, method, status, created_at FROM admin_audit_log WHERE target_username = $1 ORDER BY created_at DESC LIMIT 20', [username]).then((r) => r.rows), []),
  ]);

  return res.status(200).json({
    profile: {
      username: u.username,
      name: u.name,
      surname: u.surname,
      email: u.email,
      phoneMasked: u.phone_masked,
      memberSince: u.member_since_year,
      createdAt: u.created_at,
      dateOfBirth: u.date_of_birth,
      gender: u.gender,
      occupation: u.occupation,
      nationalId: u.national_id,
      address: u.address,
      nextOfKinName: u.next_of_kin_name,
      nextOfKinPhone: u.next_of_kin_phone,
      staffRole: u.staff_role ?? null,
    },
    accounts,
    holdings,
    loans,
    kyc,
    logins,
    finances: {
      expenses: expenses.map((e) => ({ category: e.category, amountMinor: s(e.amount_minor), frequency: e.frequency, effectiveFrom: e.effective_from, createdAt: e.created_at })),
      income: income.map((i) => ({ label: i.label, kind: i.kind, amountMinor: s(i.amount_minor), frequency: i.frequency, effectiveFrom: i.effective_from, createdAt: i.created_at })),
      placements: placements.map((p) => ({ stage: p.archetype, note: p.note, createdAt: p.created_at })),
    },
    devices,
    audit: audit.map((a) => ({ id: a.id, actorKind: a.actor_kind, actorUsername: a.actor_username, resource: a.resource, method: a.method, status: a.status, createdAt: a.created_at })),
  });
}

/** resource=audit-log (GET ?limit&username) — newest first. */
export async function handleAuditLog(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const username = req.query.username ? String(req.query.username).trim().toLowerCase() : null;
  const rows = await optional(
    () =>
      query(
        `SELECT id, actor_kind, actor_username, resource, method, target_username, status, request, response, created_at
         FROM admin_audit_log WHERE ($1::text IS NULL OR target_username = $1) ORDER BY created_at DESC LIMIT $2`,
        [username, limit],
      ).then((r) => r.rows),
    null,
  );
  if (rows === null) return res.status(200).json({ entries: [], notSetUp: true });
  return res.status(200).json({
    entries: rows.map((r) => ({
      id: r.id,
      actorKind: r.actor_kind,
      actorUsername: r.actor_username,
      resource: r.resource,
      method: r.method,
      targetUsername: r.target_username,
      status: r.status,
      request: r.request,
      response: r.response,
      createdAt: r.created_at,
    })),
  });
}
