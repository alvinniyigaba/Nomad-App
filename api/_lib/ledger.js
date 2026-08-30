import { query } from './db.js';

/** Balance is always derived — sum(amount_minor), never a stored column. */
export async function getBalanceMinor(accountId) {
  const { rows } = await query(
    'SELECT COALESCE(SUM(amount_minor), 0)::bigint AS balance FROM ledger_entries WHERE account_id = $1',
    [accountId],
  );
  return BigInt(rows[0].balance);
}

export async function getBalancesForUser(userId) {
  const { rows } = await query(
    `SELECT account_id, COALESCE(SUM(amount_minor), 0)::bigint AS balance
     FROM ledger_entries WHERE user_id = $1 GROUP BY account_id`,
    [userId],
  );
  const map = {};
  for (const row of rows) map[row.account_id] = BigInt(row.balance);
  return map;
}

/**
 * Posts a ledger entry. idempotencyKey (if given) makes retried requests
 * safe — a duplicate key returns the original entry instead of posting twice.
 */
export async function postEntry({ accountId, userId, amountMinor, kind, rail = null, memo = null, idempotencyKey = null }) {
  if (idempotencyKey) {
    const existing = await query('SELECT * FROM ledger_entries WHERE idempotency_key = $1', [idempotencyKey]);
    if (existing.rows[0]) return existing.rows[0];
  }
  const { rows } = await query(
    `INSERT INTO ledger_entries (account_id, user_id, amount_minor, kind, rail, memo, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [accountId, userId, amountMinor.toString(), kind, rail, memo, idempotencyKey],
  );
  return rows[0];
}

export async function getSumByKind(accountId, kind) {
  const { rows } = await query(
    "SELECT COALESCE(SUM(amount_minor), 0)::bigint AS total FROM ledger_entries WHERE account_id = $1 AND kind = $2",
    [accountId, kind],
  );
  return BigInt(rows[0].total);
}

export async function getEntriesForAccount(accountId, limit = 20) {
  const { rows } = await query(
    'SELECT * FROM ledger_entries WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2',
    [accountId, limit],
  );
  return rows;
}

/** Per-contributor breakdown of a (typically group) account's balance. */
export async function getContributionsByAccount(accountId) {
  const { rows } = await query(
    `SELECT user_id, COALESCE(SUM(amount_minor), 0)::bigint AS total
     FROM ledger_entries WHERE account_id = $1 GROUP BY user_id`,
    [accountId],
  );
  const map = {};
  for (const row of rows) map[row.user_id] = BigInt(row.total);
  return map;
}
