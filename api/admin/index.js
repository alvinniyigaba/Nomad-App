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
//
// resource=sync-sheet (GET): reads a published-to-web Google Sheet (CSV) —
// an append-only transaction log — and posts any new rows as real ledger
// entries. Runs daily via Vercel Cron (see vercel.json, authenticated with
// CRON_SECRET) and can also be triggered on demand with the usual
// ?token=ADMIN_TOKEN. Idempotent per row (sheet-row-<n> as the ledger's
// idempotency key), so re-running it never double-posts.
import { readFileSync } from 'fs';
import { db, query } from '../_lib/db.js';
import { postEntry } from '../_lib/ledger.js';

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

    const kind = (type || '').trim().toLowerCase();
    if (!['deposit', 'withdrawal'].includes(kind)) {
      results.errors.push({ row: rowNum, error: `Type must be "deposit" or "withdrawal", got "${type}"` });
      continue;
    }
    const amount = Number((amountStr || '').replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      results.errors.push({ row: rowNum, error: `Invalid amount "${amountStr}"` });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test((date || '').trim())) {
      results.errors.push({ row: rowNum, error: `Date must be YYYY-MM-DD, got "${date}"` });
      continue;
    }

    const idempotencyKey = `sheet-row-${rowNum}`;
    const { rows: existing } = await query('SELECT id FROM ledger_entries WHERE idempotency_key = $1', [idempotencyKey]);
    if (existing[0]) {
      results.skipped++;
      continue;
    }

    const accountId = await resolveAccountId(owner?.trim(), accountName?.trim());
    if (!accountId) {
      results.errors.push({ row: rowNum, error: `Could not resolve account "${accountName}" (owner "${owner || '(group)'}")` });
      continue;
    }
    const userId = await resolveUserId(contributor?.trim());
    if (!userId) {
      results.errors.push({ row: rowNum, error: `Unknown contributor username "${contributor}"` });
      continue;
    }

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
    results.posted++;
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
  return res.status(400).json({ error: 'Unknown resource. Use ?resource=migrate, external-holdings, or sync-sheet' });
}
