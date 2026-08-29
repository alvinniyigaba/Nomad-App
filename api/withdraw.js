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

  const { rows } = await query('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [accountId, session.user_id]);
  const account = rows[0];
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const balance = await getBalanceMinor(accountId);
  const available = balance - BigInt(account.pledged_minor);
  if (BigInt(amount) > available) {
    return res.status(400).json({ error: 'Amount exceeds what is available to withdraw' });
  }

  const entry = await postEntry({
    accountId,
    userId: session.user_id,
    amountMinor: -BigInt(amount),
    kind: 'withdrawal',
    rail: rail ?? null,
    memo: 'Withdrawal',
    idempotencyKey: idempotencyKey ?? null,
  });

  const newBalance = await getBalanceMinor(accountId);
  return res.status(200).json({ ok: true, entryId: entry.id, balanceMinor: newBalance.toString() });
}
