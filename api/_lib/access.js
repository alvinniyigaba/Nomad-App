import { query } from './db.js';

/**
 * Resolves whether a user can act on an account, and with what role.
 * Individual accounts: owner-only, role 'owner'. Group accounts: role comes
 * from account_members ('admin' | 'member'). Returns account:null when the
 * account doesn't exist or the user has no access to it (treat as 404).
 * When requireAdmin is set and the user is only a 'member', account is still
 * returned but forbidden:true is set (treat as 403, not 404 — they can see
 * it, just not do this).
 */
export async function getAccessibleAccount(accountId, userId, { requireAdmin = false } = {}) {
  const { rows } = await query('SELECT * FROM accounts WHERE id = $1', [accountId]);
  const account = rows[0];
  if (!account) return { account: null, role: null, forbidden: false };

  if (!account.is_group) {
    if (account.user_id !== userId) return { account: null, role: null, forbidden: false };
    return { account, role: 'owner', forbidden: false };
  }

  const { rows: memberRows } = await query(
    'SELECT role FROM account_members WHERE account_id = $1 AND user_id = $2',
    [accountId, userId],
  );
  const member = memberRows[0];
  if (!member) return { account: null, role: null, forbidden: false };
  if (requireAdmin && member.role !== 'admin') return { account, role: member.role, forbidden: true };
  return { account, role: member.role, forbidden: false };
}

export async function getAccountMembers(accountId) {
  const { rows } = await query(
    `SELECT u.id AS user_id, u.username, m.role
     FROM account_members m JOIN users u ON u.id = m.user_id
     WHERE m.account_id = $1 ORDER BY m.role, u.username`,
    [accountId],
  );
  return rows.map((r) => ({ userId: r.user_id, username: r.username, role: r.role }));
}
