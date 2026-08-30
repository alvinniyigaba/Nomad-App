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
import { db, query } from '../_lib/db.js';

async function resolveUserId(username) {
  const { rows } = await query('SELECT id FROM users WHERE username = $1', [username.trim().toLowerCase()]);
  return rows[0]?.id ?? null;
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
  return res.status(400).json({ error: 'Unknown resource. Use ?resource=migrate or ?resource=external-holdings' });
}
