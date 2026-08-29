import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';
import { getBalancesForUser, getEntriesForAccount, getSumByKind } from './_lib/ledger.js';

function serializeAccount(row, balanceMinor, activity, interestEarnedMinor) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    createdAt: row.created_at,
    balanceMinor: balanceMinor.toString(),
    interestEarnedMinor: interestEarnedMinor.toString(),
    targetMinor: row.target_minor?.toString() ?? null,
    targetDate: row.target_date,
    autoSaveEnabled: row.auto_save_enabled,
    autoSaveAmountMinor: row.auto_save_amount_minor?.toString() ?? null,
    autoSaveDay: row.auto_save_day,
    autoSaveRail: row.auto_save_rail,
    pledgedMinor: row.pledged_minor.toString(),
    pledgeUnlocksDate: row.pledge_unlocks_date,
    activity: activity.map((e) => ({
      id: e.id,
      amountMinor: e.amount_minor.toString(),
      kind: e.kind,
      rail: e.rail,
      memo: e.memo,
      createdAt: e.created_at,
    })),
  };
}

export default async function handler(req, res) {
  const session = await requireFullSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows: accounts } = await query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY kind DESC', [
      session.user_id,
    ]);
    const balances = await getBalancesForUser(session.user_id);

    const serialized = await Promise.all(
      accounts.map(async (a) => {
        const [activity, interestEarned] = await Promise.all([
          getEntriesForAccount(a.id, 8),
          getSumByKind(a.id, 'interest'),
        ]);
        return serializeAccount(a, balances[a.id] ?? 0n, activity, interestEarned);
      }),
    );
    return res.status(200).json({ accounts: serialized });
  }

  if (req.method === 'PATCH') {
    const { accountId, autoSaveEnabled } = req.body ?? {};
    if (typeof accountId !== 'string' || typeof autoSaveEnabled !== 'boolean') {
      return res.status(400).json({ error: 'accountId and autoSaveEnabled are required' });
    }
    const { rowCount } = await query(
      'UPDATE accounts SET auto_save_enabled = $1 WHERE id = $2 AND user_id = $3',
      [autoSaveEnabled, accountId, session.user_id],
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Account not found' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
