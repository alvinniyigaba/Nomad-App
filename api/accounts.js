import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';
import { getBalanceMinor, getEntriesForAccount, getSumByKind, getContributionsByAccount } from './_lib/ledger.js';
import { getAccessibleAccount, getAccountMembers } from './_lib/access.js';

async function serializeAccount(row, userId, balanceMinor, activity, interestEarnedMinor) {
  const base = {
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
    isGroup: row.is_group,
    activity: activity.map((e) => ({
      id: e.id,
      amountMinor: e.amount_minor.toString(),
      kind: e.kind,
      rail: e.rail,
      memo: e.memo,
      createdAt: e.created_at,
    })),
  };
  if (!row.is_group) return base;

  const [members, contributions] = await Promise.all([
    getAccountMembers(row.id),
    getContributionsByAccount(row.id),
  ]);
  const myRole = members.find((m) => m.userId === userId)?.role ?? null;
  return {
    ...base,
    myRole,
    members: members.map((m) => ({ username: m.username, role: m.role, contributionMinor: (contributions[m.userId] ?? 0n).toString() })),
  };
}

export default async function handler(req, res) {
  const session = await requireFullSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows: accounts } = await query(
      `SELECT a.* FROM accounts a
       WHERE (a.is_group = false AND a.user_id = $1)
          OR (a.is_group = true AND EXISTS (SELECT 1 FROM account_members m WHERE m.account_id = a.id AND m.user_id = $1))
       ORDER BY a.is_group ASC, a.kind DESC`,
      [session.user_id],
    );

    const serialized = await Promise.all(
      accounts.map(async (a) => {
        const [balance, activity, interestEarned] = await Promise.all([
          getBalanceMinor(a.id),
          getEntriesForAccount(a.id, 8),
          getSumByKind(a.id, 'interest'),
        ]);
        return serializeAccount(a, session.user_id, balance, activity, interestEarned);
      }),
    );
    return res.status(200).json({ accounts: serialized });
  }

  if (req.method === 'PATCH') {
    const { accountId, autoSaveEnabled } = req.body ?? {};
    if (typeof accountId !== 'string' || typeof autoSaveEnabled !== 'boolean') {
      return res.status(400).json({ error: 'accountId and autoSaveEnabled are required' });
    }
    const { account, forbidden } = await getAccessibleAccount(accountId, session.user_id, { requireAdmin: true });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (forbidden) return res.status(403).json({ error: 'Only a group admin can change this' });

    await query('UPDATE accounts SET auto_save_enabled = $1 WHERE id = $2', [autoSaveEnabled, accountId]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
