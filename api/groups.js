import { requireFullSession } from './_lib/auth.js';
import { query, withTransaction } from './_lib/db.js';

/**
 * GET: other pilot users, for the group-goal member picker (username only —
 * no PII). POST: creates a group savings goal. The caller is always an
 * admin (even if they list themselves with a different role in `members`)
 * — someone has to be able to administer the goal they just created. Any
 * authenticated user can call this; membership isn't restricted to a fixed
 * list of groups.
 */
export default async function handler(req, res) {
  const session = await requireFullSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows } = await query('SELECT username FROM users WHERE id != $1 ORDER BY username', [session.user_id]);
    return res.status(200).json({ users: rows.map((r) => r.username) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, targetMinor, targetDate, members } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const target = Number(targetMinor);
  if (!Number.isInteger(target) || target <= 0) {
    return res.status(400).json({ error: 'a positive targetMinor is required' });
  }
  if (typeof targetDate !== 'string' || !targetDate) {
    return res.status(400).json({ error: 'targetDate is required' });
  }
  if (!Array.isArray(members) || members.some((m) => typeof m?.username !== 'string' || !['admin', 'member'].includes(m?.role))) {
    return res.status(400).json({ error: 'members must be an array of { username, role: "admin" | "member" }' });
  }

  let accountId;
  try {
    accountId = await withTransaction(async (client) => {
      const { rows: [account] } = await client.query(
        `INSERT INTO accounts (user_id, kind, name, target_minor, target_date, is_group)
         VALUES ($1, 'goal', $2, $3, $4, true) RETURNING id`,
        [session.user_id, name.trim(), target, targetDate],
      );

      await client.query(
        `INSERT INTO account_members (account_id, user_id, role) VALUES ($1, $2, 'admin')
         ON CONFLICT (account_id, user_id) DO NOTHING`,
        [account.id, session.user_id],
      );

      for (const m of members) {
        const { rows: userRows } = await client.query('SELECT id FROM users WHERE username = $1', [m.username.trim().toLowerCase()]);
        if (!userRows[0]) throw Object.assign(new Error(`Unknown username: ${m.username}`), { status: 400 });
        if (userRows[0].id === session.user_id) continue; // creator is always admin, set above
        await client.query(
          `INSERT INTO account_members (account_id, user_id, role) VALUES ($1, $2, $3)
           ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [account.id, userRows[0].id, m.role],
        );
      }

      return account.id;
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  return res.status(200).json({ ok: true, accountId });
}
