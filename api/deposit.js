import { requireFullSession } from './_lib/auth.js';
import { getBalanceMinor, postEntry } from './_lib/ledger.js';
import { getAccessibleAccount } from './_lib/access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;

  const { accountId, amountMinor, rail, idempotencyKey } = req.body ?? {};
  const amount = Number(amountMinor);
  if (typeof accountId !== 'string' || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'accountId and a positive amountMinor are required' });
  }

  // Any member of a group goal can contribute — only withdrawals are admin-gated.
  const { account } = await getAccessibleAccount(accountId, session.user_id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

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
