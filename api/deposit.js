import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';
import { getBalanceMinor, postEntry } from './_lib/ledger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;

  const { accountId, amountMinor, rail, idempotencyKey } = req.body ?? {};
  const amount = Number(amountMinor);
  if (typeof accountId !== 'string' || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'accountId and a positive amountMinor are required' });
  }

  const { rows } = await query('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [accountId, session.user_id]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' });

  const entry = await postEntry({
    accountId,
    userId: session.user_id,
    amountMinor: BigInt(amount),
    kind: 'topup',
    rail: rail ?? null,
    memo: 'Top-up',
    idempotencyKey: idempotencyKey ?? null,
  });

  const newBalance = await getBalanceMinor(accountId);
  return res.status(200).json({ ok: true, entryId: entry.id, balanceMinor: newBalance.toString() });
}
