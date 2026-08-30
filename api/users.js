import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';

/** Other pilot users, for the group-goal member picker. Username only — no PII. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;

  const { rows } = await query('SELECT username FROM users WHERE id != $1 ORDER BY username', [session.user_id]);
  return res.status(200).json({ users: rows.map((r) => r.username) });
}
