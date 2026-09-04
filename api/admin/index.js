// Durable admin utility, gated by ADMIN_TOKEN (set as a Vercel environment
// variable, never hardcoded/committed). Combined into one file — Vercel's
// Hobby plan caps Serverless Functions at 12, so admin endpoints share a
// single route dispatched by ?resource=.
//
// resource=migrate (GET): applies db/schema.sql (idempotent) to production.
// One-time in spirit — safe to leave, since re-running it is a no-op.
//
// resource=external-holdings (GET/POST/PATCH/DELETE): manages a user's
// savings/investment products — both Nomad-managed (managedBy: 'nomad')
// and ones Nomad doesn't manage (managedBy: 'external', the default).
// External holdings are entered here after the user discloses them, to
// keep the data clean. Nomad-managed holdings get their value updated by
// posting a dated snapshot (snapshotDate + snapshotValueMinor on PATCH)
// rather than overwriting a single number — that history is what drives
// the real performance chart on Invest.
//
// resource=user-profile (PATCH): writes a user's bio-data fields (date of
// birth, gender, occupation, national ID, address, next of kin). Admin-
// entered, same reasoning as external-holdings.
//
// resource=sync-sheet (GET): reads a published-to-web Google Sheet (CSV) —
// an append-only transaction log — and posts any new rows as real ledger
// entries. Runs daily via Vercel Cron (see vercel.json, authenticated with
// CRON_SECRET) and can also be triggered on demand with the usual
// ?token=ADMIN_TOKEN. Idempotent per row (sheet-row-<n> as the ledger's
// idempotency key), so re-running it never double-posts. Left in place as
// a fallback, but the primary path is now resource=post-entries below.
//
// resource=post-entries (POST): same row validation/posting as sync-sheet,
// but takes pre-parsed rows directly in the request body instead of
// fetching a URL — used when Claude reads a private Google Sheet (via the
// Drive connection, no "publish to web" needed) and submits what it finds.
// Caller supplies its own idempotencyKey per row.
//
// resource=sync-investments (GET): each pilot user keeps their own sheet
// (unlike the shared savings ledger), so INVESTMENT_SHEETS is a JSON env
// var mapping username -> that user's published-to-web CSV URL for just
// their Investments tab. Reads every mapped sheet, upserts one
// external_holdings row per Investment Vehicle (created on first sight,
// managed_by/interest rate/notes refreshed on every run since the sheet
// is the source of truth), and always upserts today's dated snapshot from
// Est. Worth — snapshot inserts are ON CONFLICT (holding_id, date) DO
// UPDATE, so re-running the same day is safe. Runs daily via Vercel Cron.
//
// resource=accounts (GET): read-only, a user's own accounts and any group
// accounts they belong to, with derived balances (and member lists for
// group accounts) — for verifying a real balance, or confirming an exact
// account name/membership before posting a correction, without needing
// that user's own session.
//
// resource=update-account (PATCH): edits the name and/or target
// (targetMinor, targetDate) of one of a user's own (non-group) accounts.
// Group accounts are excluded on purpose — editing a shared fund is a
// member decision, not an admin one.
//
// resource=create-user (POST): onboards one real pilot user — a users row,
// a liquid account (no opening entry; a genuinely new user starts at zero,
// unlike the original fixture users), kyc_status/user_settings at the
// schema's own defaults. No fake goal or balance history — unlike
// scripts/seed.mjs, this never touches existing rows.
//
// resource=delete-user (DELETE): removes a user and everything that
// cascades from it (accounts, ledger entries, kyc/settings). For pilot
// fixture cleanup — e.g. replacing a placeholder record with a properly
// onboarded one. Refuses (unless forced) if the user has ever contributed
// to a group account they don't own, since deleting their ledger entries
// there would silently shrink a shared fund that other members still see.
//
// resource=login-stats (GET): read-only login activity per user, derived
// from sessions (one row per password login; never purged, so this is a
// full history since the pilot started). Not page/feature analytics —
// just login count, first/last login, and how many of those logins
// completed the PIN step.
//
// resource=reconciliation (GET): read-only, every user's position in one
// call — individual account balances, their own contribution to each
// group account they belong to, and their investment holdings with the
// latest dated snapshot. Exists so the fund administration spreadsheet
// can be driven from the app's ledger rather than typed in beside it:
// the ledger is the source of truth, this is the extract the sheet
// reconciles against. Group contributions are split per member (the
// sheet needs "who put in what", which the pooled account balance alone
// can't tell you). Money figures are minor units, as strings.
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import { db, query, withTransaction } from '../_lib/db.js';
import { getContributionsByAccount, postEntry } from '../_lib/ledger.js';
import { getAccountMembers } from '../_lib/access.js';

async function resolveUserId(username) {
  if (!username) return null;
  const { rows } = await query('SELECT id FROM users WHERE username = $1', [username.trim().toLowerCase()]);
  return rows[0]?.id ?? null;
}

async function resolveAccountId(ownerUsername, accountName) {
  if (ownerUsername) {
    const { rows } = await query(
      `SELECT a.id FROM accounts a JOIN users u ON u.id = a.user_id
       WHERE a.name = $1 AND a.is_group = false AND u.username = $2`,
      [accountName, ownerUsername.trim().toLowerCase()],
    );
    return rows[0]?.id ?? null;
  }
  // No owner given -> must be a group goal, and the name must be unambiguous.
  const { rows } = await query('SELECT id FROM accounts WHERE name = $1 AND is_group = true', [accountName]);
  return rows.length === 1 ? rows[0].id : null;
}

/** Minimal RFC4180 CSV parser — handles quoted fields with embedded commas/quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function handleMigrate(req, res) {
  const schemaPath = new URL('../../db/schema.sql', import.meta.url);
  const schema = readFileSync(schemaPath, 'utf-8');
  await db().query(schema);
  return res.status(200).json({ ok: true, message: 'Schema applied.' });
}

async function handleExternalHoldings(req, res) {
  if (req.method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username query param is required' });
    const userId = await resolveUserId(username);
    if (!userId) return res.status(404).json({ error: 'No such user' });
    const { rows } = await query('SELECT * FROM external_holdings WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const holdings = await Promise.all(
      rows.map(async (h) => {
        if (h.managed_by !== 'nomad') return h;
        const { rows: history } = await query(
          'SELECT value_minor, snapshot_date FROM investment_snapshots WHERE holding_id = $1 ORDER BY snapshot_date ASC',
          [h.id],
        );
        return { ...h, history };
      }),
    );
    return res.status(200).json({ holdings });
  }

  if (req.method === 'POST') {
    const { username, providerName, productType, balanceMinor, interestRateBps, termMonths, maturityDate, notes, managedBy, status, investmentCurrency } = req.body ?? {};
    if (typeof username !== 'string' || typeof providerName !== 'string' || !providerName.trim()) {
      return res.status(400).json({ error: 'username and providerName are required' });
    }
    if (!['savings', 'fixed_deposit', 'investment', 'other'].includes(productType)) {
      return res.status(400).json({ error: 'productType must be savings, fixed_deposit, investment, or other' });
    }
    if (managedBy && !['nomad', 'external'].includes(managedBy)) {
      return res.status(400).json({ error: 'managedBy must be nomad or external' });
    }
    if (status && !['active', 'invited'].includes(status)) {
      return res.status(400).json({ error: 'status must be active or invited' });
    }
    const userId = await resolveUserId(username);
    if (!userId) return res.status(404).json({ error: 'No such user' });

    const { rows } = await query(
      `INSERT INTO external_holdings (user_id, provider_name, product_type, balance_minor, interest_rate_bps, term_months, maturity_date, notes, managed_by, status, investment_currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'external'),COALESCE($10,'active'),$11) RETURNING *`,
      [userId, providerName.trim(), productType, balanceMinor ?? null, interestRateBps ?? null, termMonths ?? null, maturityDate ?? null, notes ?? null, managedBy ?? null, status ?? null, investmentCurrency ?? null],
    );
    return res.status(200).json({ ok: true, holding: rows[0] });
  }

  if (req.method === 'PATCH') {
    const { id, providerName, productType, balanceMinor, interestRateBps, termMonths, maturityDate, notes, managedBy, status, investmentCurrency, snapshotDate, snapshotValueMinor } = req.body ?? {};
    if (typeof id !== 'string') return res.status(400).json({ error: 'id is required' });

    if (snapshotDate != null || snapshotValueMinor != null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate ?? '')) return res.status(400).json({ error: 'snapshotDate must be YYYY-MM-DD' });
      const amount = Number(snapshotValueMinor);
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'snapshotValueMinor must be a non-negative number' });
      const { rows: holdingRows } = await query('SELECT managed_by FROM external_holdings WHERE id = $1', [id]);
      if (!holdingRows[0]) return res.status(404).json({ error: 'No such holding' });
      if (holdingRows[0].managed_by !== 'nomad') return res.status(400).json({ error: 'Snapshots are only for managedBy: nomad holdings' });
      await query(
        `INSERT INTO investment_snapshots (holding_id, value_minor, snapshot_date) VALUES ($1,$2,$3)
         ON CONFLICT (holding_id, snapshot_date) DO UPDATE SET value_minor = EXCLUDED.value_minor`,
        [id, Math.round(amount), snapshotDate],
      );
    }

    const { rows } = await query(
      `UPDATE external_holdings SET
         provider_name = COALESCE($2, provider_name),
         product_type = COALESCE($3, product_type),
         balance_minor = COALESCE($4, balance_minor),
         interest_rate_bps = COALESCE($5, interest_rate_bps),
         term_months = COALESCE($6, term_months),
         maturity_date = COALESCE($7, maturity_date),
         notes = COALESCE($8, notes),
         managed_by = COALESCE($9, managed_by),
         status = COALESCE($10, status),
         investment_currency = COALESCE($11, investment_currency),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, providerName ?? null, productType ?? null, balanceMinor ?? null, interestRateBps ?? null, termMonths ?? null, maturityDate ?? null, notes ?? null, managedBy ?? null, status ?? null, investmentCurrency ?? null],
    );
    if (!rows[0]) return res.status(404).json({ error: 'No such holding' });
    return res.status(200).json({ ok: true, holding: rows[0] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id query param is required' });
    const { rowCount } = await query('DELETE FROM external_holdings WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'No such holding' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleUserProfile(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { username, dateOfBirth, gender, occupation, nationalId, address, nextOfKinName, nextOfKinPhone } = req.body ?? {};
  if (typeof username !== 'string') return res.status(400).json({ error: 'username is required' });

  const { rows } = await query(
    `UPDATE users SET
       date_of_birth = COALESCE($2, date_of_birth),
       gender = COALESCE($3, gender),
       occupation = COALESCE($4, occupation),
       national_id = COALESCE($5, national_id),
       address = COALESCE($6, address),
       next_of_kin_name = COALESCE($7, next_of_kin_name),
       next_of_kin_phone = COALESCE($8, next_of_kin_phone)
     WHERE username = $1
     RETURNING id, username, date_of_birth, gender, occupation, national_id, address, next_of_kin_name, next_of_kin_phone`,
    [username.trim().toLowerCase(), dateOfBirth ?? null, gender ?? null, occupation ?? null, nationalId ?? null, address ?? null, nextOfKinName ?? null, nextOfKinPhone ?? null],
  );
  if (!rows[0]) return res.status(404).json({ error: 'No such user' });
  return res.status(200).json({ ok: true, user: rows[0] });
}

/** Read-only: a user's own (non-group) accounts with derived balances — for verifying real balances before a correction, same derivation as api/accounts.js. */
async function handleAccounts(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username query param is required' });
  const userId = await resolveUserId(username);
  if (!userId) return res.status(404).json({ error: 'No such user' });

  const { rows } = await query(
    `SELECT a.id, a.kind, a.name, a.is_group, a.closed_at,
            COALESCE(SUM(l.amount_minor), 0)::bigint AS balance_minor
     FROM accounts a
     LEFT JOIN ledger_entries l ON l.account_id = a.id
     WHERE (a.is_group = false AND a.user_id = $1)
        OR (a.is_group = true AND EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = $1))
     GROUP BY a.id
     ORDER BY a.is_group ASC, a.kind DESC, a.created_at ASC`,
    [userId],
  );
  const accounts = await Promise.all(
    rows.map(async (r) => {
      const base = { id: r.id, kind: r.kind, name: r.name, isGroup: r.is_group, closedAt: r.closed_at, balanceMinor: r.balance_minor.toString() };
      if (!r.is_group) return base;
      // Who put in what — the pooled balance alone can't answer that, and
      // reconciling a shared fund against an external record needs it.
      const [members, contributions] = await Promise.all([getAccountMembers(r.id), getContributionsByAccount(r.id)]);
      return {
        ...base,
        members: members.map((m) => ({ ...m, contributionMinor: (contributions[m.userId] ?? 0n).toString() })),
      };
    }),
  );
  return res.status(200).json({ accounts });
}

/** Renames one of a user's own (non-group) accounts. Group accounts are out of scope — renaming a shared fund is a member decision, not an admin one. */
async function handleUpdateAccount(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { id, name, targetMinor, targetDate } = req.body ?? {};
  if (typeof id !== 'string') return res.status(400).json({ error: 'id is required' });
  if (name == null && targetMinor == null && targetDate == null) {
    return res.status(400).json({ error: 'Provide at least one of name, targetMinor, targetDate' });
  }
  if (name != null && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (targetDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return res.status(400).json({ error: 'targetDate must be YYYY-MM-DD' });
  }
  const { rows } = await query(
    `UPDATE accounts SET
       name = COALESCE($2, name),
       target_minor = COALESCE($3, target_minor),
       target_date = COALESCE($4, target_date)
     WHERE id = $1 AND is_group = false
     RETURNING id, kind, name, target_minor, target_date`,
    [id, name?.trim() ?? null, targetMinor ?? null, targetDate ?? null],
  );
  if (!rows[0]) return res.status(404).json({ error: 'No such individual account' });
  return res.status(200).json({ ok: true, account: rows[0] });
}

/** Onboards one real pilot user. See top-of-file comment for what it does and doesn't seed. */
async function handleCreateUser(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username, password, pin, name, surname, phoneMasked, email, liquidAccountName } = req.body ?? {};
  for (const [field, value] of Object.entries({ username, password, pin, name, surname, phoneMasked, email })) {
    if (typeof value !== 'string' || !value.trim()) return res.status(400).json({ error: `${field} is required` });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const existing = await resolveUserId(normalizedUsername);
  if (existing) return res.status(409).json({ error: `Username "${normalizedUsername}" already exists` });

  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = await bcrypt.hash(pin, 10);

  const user = await withTransaction(async (client) => {
    const { rows: [u] } = await client.query(
      `INSERT INTO users (username, password_hash, pin_hash, name, surname, phone_masked, email, member_since_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, username`,
      [normalizedUsername, passwordHash, pinHash, name.trim(), surname.trim(), phoneMasked.trim(), email.trim(), new Date().getFullYear()],
    );
    await client.query('INSERT INTO kyc_status (user_id) VALUES ($1)', [u.id]);
    await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [u.id]);
    await client.query(`INSERT INTO accounts (user_id, kind, name) VALUES ($1,'liquid',$2)`, [u.id, (liquidAccountName || 'Liquid').trim()]);
    return u;
  });
  return res.status(200).json({ ok: true, user: { id: user.id, username: user.username } });
}

/** Removes a user and everything that cascades from it. See top-of-file comment for the group-fund safety check. */
async function handleDeleteUser(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { username, force } = req.query;
  if (!username) return res.status(400).json({ error: 'username query param is required' });
  const userId = await resolveUserId(username);
  if (!userId) return res.status(404).json({ error: 'No such user' });

  const { rows: groupEntries } = await query(
    `SELECT DISTINCT a.id, a.name, COALESCE(SUM(l.amount_minor) FILTER (WHERE l.user_id = $1), 0)::bigint AS their_contribution_minor
     FROM ledger_entries l
     JOIN accounts a ON a.id = l.account_id
     WHERE l.user_id = $1 AND a.is_group = true
     GROUP BY a.id, a.name`,
    [userId],
  );
  if (groupEntries.length > 0 && force !== 'true') {
    return res.status(409).json({
      error: 'This user has contributed to group account(s). Deleting them would delete those ledger entries too, shrinking the shared balance. Pass force=true to proceed anyway.',
      groupAccounts: groupEntries.map((g) => ({ id: g.id, name: g.name, theirContributionMinor: g.their_contribution_minor.toString() })),
    });
  }

  await query('DELETE FROM users WHERE id = $1', [userId]);
  return res.status(200).json({ ok: true });
}

/** Read-only: login activity per user, derived from sessions (one row per password login, never purged). */
async function handleLoginStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { rows } = await query(
    `SELECT u.username,
            COUNT(s.id) AS login_count,
            MIN(s.created_at) AS first_login,
            MAX(s.created_at) AS last_login,
            COUNT(s.pin_verified_at) AS full_sessions
     FROM users u
     LEFT JOIN sessions s ON s.user_id = u.id
     GROUP BY u.id, u.username
     ORDER BY last_login DESC NULLS LAST`,
  );
  const totalUsers = rows.length;
  const usersWithLogin = rows.filter((r) => Number(r.login_count) > 0).length;

  return res.status(200).json({
    totalUsers,
    usersWithLogin,
    usersNeverLoggedIn: totalUsers - usersWithLogin,
    users: rows.map((r) => ({
      username: r.username,
      loginCount: Number(r.login_count),
      fullSessions: Number(r.full_sessions),
      firstLogin: r.first_login,
      lastLogin: r.last_login,
    })),
  });
}

/**
 * Read-only: the whole pilot's position in one call, for reconciling an
 * external fund-administration record against the ledger. Savings figures
 * are derived from ledger_entries (the same sums the app itself shows);
 * investment figures come from the latest dated snapshot per holding.
 *
 * savingsTotalMinor per user = their individual account balances plus
 * their own contributions to group accounts — deliberately personal, the
 * same basis the Home screen's Total position uses, so a member statement
 * in a spreadsheet can be compared against it line for line. Closed
 * accounts are reported (with closedAt set) rather than dropped, since an
 * external record may still carry a row for one.
 */
async function handleReconciliation(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [{ rows: users }, { rows: individual }, { rows: groupContributions }, { rows: holdings }] = await Promise.all([
    query('SELECT id, username, name, surname FROM users ORDER BY username'),
    query(
      `SELECT a.user_id, a.id, a.kind, a.name, a.closed_at,
              COALESCE(SUM(l.amount_minor), 0)::bigint AS balance_minor
       FROM accounts a
       LEFT JOIN ledger_entries l ON l.account_id = a.id
       WHERE a.is_group = false
       GROUP BY a.id
       ORDER BY a.kind DESC, a.created_at ASC`,
    ),
    // One row per (member, group account): what that member alone put in,
    // alongside the pooled total so both sides of a shared fund reconcile.
    query(
      `SELECT l.user_id, a.id AS account_id, a.name,
              COALESCE(SUM(l.amount_minor), 0)::bigint AS contribution_minor,
              (SELECT COALESCE(SUM(l2.amount_minor), 0)::bigint FROM ledger_entries l2 WHERE l2.account_id = a.id) AS account_balance_minor
       FROM accounts a
       JOIN ledger_entries l ON l.account_id = a.id
       WHERE a.is_group = true
       GROUP BY l.user_id, a.id
       ORDER BY a.name`,
    ),
    query(
      `SELECT h.user_id, h.id, h.provider_name, h.product_type, h.managed_by, h.status,
              h.investment_currency, h.interest_rate_bps, h.notes,
              s.value_minor AS latest_value_minor, s.snapshot_date AS latest_snapshot_date
       FROM external_holdings h
       LEFT JOIN LATERAL (
         SELECT value_minor, snapshot_date FROM investment_snapshots
         WHERE holding_id = h.id ORDER BY snapshot_date DESC LIMIT 1
       ) s ON true
       ORDER BY h.created_at ASC`,
    ),
  ]);

  const byUser = new Map(users.map((u) => [u.id, u]));
  const bucket = (id) => {
    const u = byUser.get(id);
    return u ? (u.rows ??= { individualAccounts: [], groupContributions: [], investments: [] }) : null;
  };
  for (const r of individual) {
    bucket(r.user_id)?.individualAccounts.push({
      id: r.id,
      kind: r.kind,
      name: r.name,
      closedAt: r.closed_at,
      balanceMinor: r.balance_minor.toString(),
    });
  }
  for (const r of groupContributions) {
    bucket(r.user_id)?.groupContributions.push({
      accountId: r.account_id,
      accountName: r.name,
      contributionMinor: r.contribution_minor.toString(),
      accountBalanceMinor: r.account_balance_minor.toString(),
    });
  }
  for (const r of holdings) {
    bucket(r.user_id)?.investments.push({
      id: r.id,
      providerName: r.provider_name,
      productType: r.product_type,
      managedBy: r.managed_by,
      status: r.status,
      investmentCurrency: r.investment_currency,
      interestRateBps: r.interest_rate_bps,
      notes: r.notes,
      latestValueMinor: r.latest_value_minor === null ? null : r.latest_value_minor.toString(),
      latestSnapshotDate: r.latest_snapshot_date,
    });
  }

  let savingsTotal = 0n;
  let investmentTotal = 0n;
  const out = users.map((u) => {
    const { individualAccounts = [], groupContributions: groups = [], investments = [] } = u.rows ?? {};
    const savings =
      individualAccounts.reduce((sum, a) => sum + BigInt(a.balanceMinor), 0n) +
      groups.reduce((sum, g) => sum + BigInt(g.contributionMinor), 0n);
    // Mirrors the app's own Invested figure: nomad-managed and still active.
    const invested = investments
      .filter((h) => h.managedBy === 'nomad' && h.status === 'active' && h.latestValueMinor !== null)
      .reduce((sum, h) => sum + BigInt(h.latestValueMinor), 0n);
    savingsTotal += savings;
    investmentTotal += invested;
    return {
      username: u.username,
      fullName: `${u.name} ${u.surname}`.trim(),
      individualAccounts,
      groupContributions: groups,
      investments,
      savingsTotalMinor: savings.toString(),
      investmentValueMinor: invested.toString(),
    };
  });

  return res.status(200).json({
    asOf: new Date().toISOString(),
    totals: {
      users: users.length,
      savingsMinor: savingsTotal.toString(),
      investmentValueMinor: investmentTotal.toString(),
    },
    users: out,
  });
}

/**
 * Validates and posts one transaction-log row. Returns { posted: true },
 * { skipped: true } (already synced under this idempotencyKey), or
 * { error }. Shared by the CSV-fetch path (sync-sheet) and the
 * direct-submission path (post-entries).
 */
async function processRow({ idempotencyKey, date, owner, accountName, contributor, type, amountStr, memo }) {
  const kind = (type || '').trim().toLowerCase();
  if (!['deposit', 'withdrawal'].includes(kind)) {
    return { error: `Type must be "deposit" or "withdrawal", got "${type}"` };
  }
  const amount = Number((amountStr ?? '').toString().replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: `Invalid amount "${amountStr}"` };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test((date || '').trim())) {
    return { error: `Date must be YYYY-MM-DD, got "${date}"` };
  }

  const { rows: existing } = await query('SELECT id FROM ledger_entries WHERE idempotency_key = $1', [idempotencyKey]);
  if (existing[0]) return { skipped: true };

  const accountId = await resolveAccountId(owner?.trim(), accountName?.trim());
  if (!accountId) return { error: `Could not resolve account "${accountName}" (owner "${owner || '(group)'}")` };

  const userId = await resolveUserId(contributor?.trim());
  if (!userId) return { error: `Unknown contributor username "${contributor}"` };

  const amountMinor = BigInt(Math.round(amount * 100)) * (kind === 'withdrawal' ? -1n : 1n);
  await postEntry({
    accountId,
    userId,
    amountMinor,
    kind: kind === 'withdrawal' ? 'withdrawal' : 'topup',
    memo: memo?.trim() || (kind === 'withdrawal' ? 'Withdrawal' : 'Deposit'),
    idempotencyKey,
    createdAt: date.trim(),
  });
  return { posted: true };
}

async function handleSyncSheet(req, res) {
  const csvUrl = process.env.SHEET_CSV_URL;
  if (!csvUrl) return res.status(500).json({ error: 'SHEET_CSV_URL is not set' });

  const csvRes = await fetch(csvUrl);
  if (!csvRes.ok) return res.status(502).json({ error: `Could not fetch sheet (HTTP ${csvRes.status})` });
  const text = await csvRes.text();

  const [, ...dataRows] = parseCsv(text); // first row is the header
  const results = { posted: 0, skipped: 0, errors: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 1; // stable as long as rows are only ever appended, never inserted/reordered
    const [date, owner, accountName, contributor, type, amountStr, memo] = dataRows[i];
    if (!date?.trim() && !accountName?.trim()) continue; // blank trailing row

    const result = await processRow({ idempotencyKey: `sheet-row-${rowNum}`, date, owner, accountName, contributor, type, amountStr, memo });
    if (result.error) results.errors.push({ row: rowNum, error: result.error });
    else if (result.skipped) results.skipped++;
    else results.posted++;
  }

  return res.status(200).json({ ok: true, ...results });
}

function parsePercentToBps(str) {
  const n = Number((str || '').toString().replace('%', '').trim());
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function parseMoney(str) {
  const n = Number((str || '').toString().replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Each pilot user keeps their own Google Sheet with an "Investments" tab
 * (the INVESTMENT MANAGER table). Since it's one sheet per person rather
 * than a shared ledger, INVESTMENT_SHEETS maps username -> that user's
 * published-to-web CSV URL for just that tab, and this syncs all of them.
 */
async function syncInvestmentsForUser(username, csvUrl, results) {
  const userId = await resolveUserId(username);
  if (!userId) {
    results.errors.push({ username, error: 'Unknown username' });
    return;
  }

  const csvRes = await fetch(csvUrl);
  if (!csvRes.ok) {
    results.errors.push({ username, error: `Could not fetch sheet (HTTP ${csvRes.status})` });
    return;
  }
  const rows = parseCsv(await csvRes.text());
  const headerIdx = rows.findIndex((r) => r.some((c) => (c || '').trim().toLowerCase() === 'investment vehicle'));
  if (headerIdx === -1) {
    results.errors.push({ username, error: 'Could not find the "Investment Vehicle" header row' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows.slice(headerIdx + 1)) {
    const [startDate, vehicle, investmentCurrency, , , netInvestedStr, tRateStr, , estWorthStr, tcdStr, key] = row;
    if (!vehicle?.trim()) continue; // blank trailing row

    const providerName = vehicle.trim();
    const currency = investmentCurrency?.trim() ? investmentCurrency.trim().toUpperCase() : null;
    const estWorth = parseMoney(estWorthStr);
    const netInvested = parseMoney(netInvestedStr);
    const interestRateBps = parsePercentToBps(tRateStr);
    const tcd = parseMoney(tcdStr);
    const managedBy = /nomad/i.test(key || '') ? 'nomad' : 'external';

    if (estWorth == null) {
      results.errors.push({ username, vehicle: providerName, error: `Invalid Est. Worth "${estWorthStr}"` });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test((startDate || '').trim())) {
      results.errors.push({ username, vehicle: providerName, error: `Invalid Investment Start Date "${startDate}"` });
      continue;
    }

    const notes = tcd != null
      ? `Total cost to date: UGX ${tcd.toLocaleString('en-US')} (processing/bank fees, tracked separately — not deducted from position value).`
      : null;

    const { rows: existing } = await query(
      'SELECT id FROM external_holdings WHERE user_id = $1 AND provider_name = $2',
      [userId, providerName],
    );

    let holdingId;
    if (existing[0]) {
      holdingId = existing[0].id;
      await query(
        `UPDATE external_holdings SET interest_rate_bps = $2, notes = COALESCE($3, notes), managed_by = $4, investment_currency = COALESCE($5, investment_currency), updated_at = now() WHERE id = $1`,
        [holdingId, interestRateBps, notes, managedBy, currency],
      );
    } else {
      const { rows: created } = await query(
        `INSERT INTO external_holdings (user_id, provider_name, product_type, managed_by, status, interest_rate_bps, notes, investment_currency)
         VALUES ($1,$2,'investment',$3,'active',$4,$5,$6) RETURNING id`,
        [userId, providerName, managedBy, interestRateBps, notes, currency],
      );
      holdingId = created[0].id;
      if (netInvested != null) {
        await query(
          `INSERT INTO investment_snapshots (holding_id, value_minor, snapshot_date) VALUES ($1,$2,$3)
           ON CONFLICT (holding_id, snapshot_date) DO UPDATE SET value_minor = EXCLUDED.value_minor`,
          [holdingId, Math.round(netInvested * 100), startDate.trim()],
        );
      }
    }

    await query(
      `INSERT INTO investment_snapshots (holding_id, value_minor, snapshot_date) VALUES ($1,$2,$3)
       ON CONFLICT (holding_id, snapshot_date) DO UPDATE SET value_minor = EXCLUDED.value_minor`,
      [holdingId, Math.round(estWorth * 100), today],
    );
    results.synced++;
  }
}

async function handleSyncInvestments(req, res) {
  let sheetMap;
  try {
    sheetMap = JSON.parse(process.env.INVESTMENT_SHEETS || '{}');
  } catch {
    return res.status(500).json({ error: 'INVESTMENT_SHEETS env var is not valid JSON' });
  }
  const usernames = Object.keys(sheetMap);
  if (usernames.length === 0) return res.status(500).json({ error: 'INVESTMENT_SHEETS is not set (or empty)' });

  const results = { synced: 0, errors: [] };
  for (const username of usernames) {
    await syncInvestmentsForUser(username, sheetMap[username], results);
  }
  return res.status(200).json({ ok: true, ...results });
}

async function handlePostEntries(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { entries } = req.body ?? {};
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({
      error: 'entries must be a non-empty array of { idempotencyKey, date, owner, accountName, contributor, type, amountStr, memo }',
    });
  }

  const results = { posted: 0, skipped: 0, errors: [] };
  for (const e of entries) {
    if (typeof e?.idempotencyKey !== 'string' || !e.idempotencyKey) {
      results.errors.push({ idempotencyKey: e?.idempotencyKey ?? null, error: 'idempotencyKey is required for each entry' });
      continue;
    }
    const result = await processRow(e);
    if (result.error) results.errors.push({ idempotencyKey: e.idempotencyKey, error: result.error });
    else if (result.skipped) results.skipped++;
    else results.posted++;
  }

  return res.status(200).json({ ok: true, ...results });
}

function isAuthorized(req) {
  if (process.env.ADMIN_TOKEN && req.query.token === process.env.ADMIN_TOKEN) return true;
  const authHeader = req.headers.authorization || '';
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  return false;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(403).json({ error: 'Forbidden' });

  if (req.query.resource === 'migrate') return handleMigrate(req, res);
  if (req.query.resource === 'external-holdings') return handleExternalHoldings(req, res);
  if (req.query.resource === 'sync-sheet') return handleSyncSheet(req, res);
  if (req.query.resource === 'sync-investments') return handleSyncInvestments(req, res);
  if (req.query.resource === 'post-entries') return handlePostEntries(req, res);
  if (req.query.resource === 'user-profile') return handleUserProfile(req, res);
  if (req.query.resource === 'accounts') return handleAccounts(req, res);
  if (req.query.resource === 'update-account') return handleUpdateAccount(req, res);
  if (req.query.resource === 'create-user') return handleCreateUser(req, res);
  if (req.query.resource === 'delete-user') return handleDeleteUser(req, res);
  if (req.query.resource === 'login-stats') return handleLoginStats(req, res);
  if (req.query.resource === 'reconciliation') return handleReconciliation(req, res);
  return res.status(400).json({
    error: 'Unknown resource. Use ?resource=migrate, external-holdings, sync-sheet, sync-investments, post-entries, user-profile, accounts, update-account, create-user, delete-user, login-stats, or reconciliation',
  });
}
