// Durable admin utility, gated by ADMIN_TOKEN (set as a Vercel environment
// variable, never hardcoded/committed). Combined into one file — Vercel's
// Hobby plan caps Serverless Functions at 12, so admin endpoints share a
// single route dispatched by ?resource=.
//
// resource=migrate (GET): applies db/schema.sql (idempotent) to production.
// One-time in spirit — safe to leave, since re-running it is a no-op.
//
// resource=external-holdings (GET/POST/PATCH/DELETE): manages a user's
// savings/investment products Nomad doesn't manage. Entered here rather
// than self-serve, after the user discloses them to Nomad, to keep the
// data clean.
import { readFileSync } from 'fs';
import { db, query, withTransaction } from '../_lib/db.js';

async function resolveUserId(username) {
  const { rows } = await query('SELECT id FROM users WHERE username = $1', [username.trim().toLowerCase()]);
  return rows[0]?.id ?? null;
}

// One-time: creates the real Niyigaba/Kirabo joint goal with their actual
// deposit history, backdated to the real transaction dates. Delete this
// function (and its dispatch line below) after running it once — unlike
// migrate/external-holdings, this isn't meant to be a reusable tool.
const OUR_FIRST_FUND = {
  name: 'Our First Fund',
  targetMinor: 200000000, // UGX 2,000,000
  targetDate: '2026-12-30',
  creatorUsername: 'niyigaba',
  otherAdminUsername: 'hisbabe',
  entries: [
    { date: '2026-01-11', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-01-29', username: 'hisbabe', amountMinor: 5000000 },
    { date: '2026-02-04', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-02-11', username: 'hisbabe', amountMinor: 5000000 },
    { date: '2026-03-03', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-03-31', username: 'hisbabe', amountMinor: 5000000 },
    { date: '2026-04-04', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-04-15', username: 'hisbabe', amountMinor: 5000000 },
    { date: '2026-04-28', username: 'hisbabe', amountMinor: 10000000 },
    { date: '2026-05-04', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-05-29', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-06-04', username: 'niyigaba', amountMinor: 5000000 },
    { date: '2026-07-18', username: 'niyigaba', amountMinor: 10000000 },
    { date: '2026-08-04', username: 'hisbabe', amountMinor: 10000000 },
    { date: '2026-08-26', username: 'niyigaba', amountMinor: 7500000 },
  ],
};

async function handleOurFirstFund(req, res) {
  const { rows: existing } = await query(
    `SELECT a.id FROM accounts a JOIN users u ON u.id = a.user_id
     WHERE a.name = $1 AND a.is_group = true AND u.username = $2`,
    [OUR_FIRST_FUND.name, OUR_FIRST_FUND.creatorUsername],
  );
  if (existing[0]) return res.status(409).json({ error: 'Already created', accountId: existing[0].id });

  const creatorId = await resolveUserId(OUR_FIRST_FUND.creatorUsername);
  const otherId = await resolveUserId(OUR_FIRST_FUND.otherAdminUsername);
  if (!creatorId || !otherId) return res.status(404).json({ error: 'Could not resolve one of the usernames' });

  const earliestDate = OUR_FIRST_FUND.entries.reduce((min, e) => (e.date < min ? e.date : min), OUR_FIRST_FUND.entries[0].date);

  const result = await withTransaction(async (client) => {
    const { rows: [account] } = await client.query(
      `INSERT INTO accounts (user_id, kind, name, target_minor, target_date, is_group, created_at)
       VALUES ($1, 'goal', $2, $3, $4, true, $5) RETURNING id`,
      [creatorId, OUR_FIRST_FUND.name, OUR_FIRST_FUND.targetMinor, OUR_FIRST_FUND.targetDate, earliestDate],
    );
    await client.query(`INSERT INTO account_members (account_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'admin')`, [
      account.id,
      creatorId,
      otherId,
    ]);
    for (const e of OUR_FIRST_FUND.entries) {
      const userId = await resolveUserId(e.username);
      await client.query(
        `INSERT INTO ledger_entries (account_id, user_id, amount_minor, kind, memo, created_at) VALUES ($1, $2, $3, 'topup', 'Deposit', $4)`,
        [account.id, userId, e.amountMinor, e.date],
      );
    }
    return account.id;
  });

  const { rows: totalRows } = await query('SELECT COALESCE(SUM(amount_minor),0)::bigint AS total FROM ledger_entries WHERE account_id = $1', [result]);
  return res.status(200).json({ ok: true, accountId: result, totalMinor: totalRows[0].total });
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
    return res.status(200).json({ holdings: rows });
  }

  if (req.method === 'POST') {
    const { username, providerName, productType, balanceMinor, interestRateBps, termMonths, maturityDate, notes } = req.body ?? {};
    if (typeof username !== 'string' || typeof providerName !== 'string' || !providerName.trim()) {
      return res.status(400).json({ error: 'username and providerName are required' });
    }
    if (!['savings', 'fixed_deposit', 'investment', 'other'].includes(productType)) {
      return res.status(400).json({ error: 'productType must be savings, fixed_deposit, investment, or other' });
    }
    const userId = await resolveUserId(username);
    if (!userId) return res.status(404).json({ error: 'No such user' });

    const { rows } = await query(
      `INSERT INTO external_holdings (user_id, provider_name, product_type, balance_minor, interest_rate_bps, term_months, maturity_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, providerName.trim(), productType, balanceMinor ?? null, interestRateBps ?? null, termMonths ?? null, maturityDate ?? null, notes ?? null],
    );
    return res.status(200).json({ ok: true, holding: rows[0] });
  }

  if (req.method === 'PATCH') {
    const { id, providerName, productType, balanceMinor, interestRateBps, termMonths, maturityDate, notes } = req.body ?? {};
    if (typeof id !== 'string') return res.status(400).json({ error: 'id is required' });
    const { rows } = await query(
      `UPDATE external_holdings SET
         provider_name = COALESCE($2, provider_name),
         product_type = COALESCE($3, product_type),
         balance_minor = COALESCE($4, balance_minor),
         interest_rate_bps = COALESCE($5, interest_rate_bps),
         term_months = COALESCE($6, term_months),
         maturity_date = COALESCE($7, maturity_date),
         notes = COALESCE($8, notes),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, providerName ?? null, productType ?? null, balanceMinor ?? null, interestRateBps ?? null, termMonths ?? null, maturityDate ?? null, notes ?? null],
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

export default async function handler(req, res) {
  if (req.query.token !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.query.resource === 'migrate') return handleMigrate(req, res);
  if (req.query.resource === 'external-holdings') return handleExternalHoldings(req, res);
  if (req.query.resource === 'our-first-fund') return handleOurFirstFund(req, res);
  return res.status(400).json({ error: 'Unknown resource. Use ?resource=migrate, external-holdings, or our-first-fund' });
}
