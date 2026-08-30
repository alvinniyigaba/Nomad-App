// One-time production patch, round 2: renames 8 existing pilot seats to
// their new usernames/credentials in place (preserving accounts/ledger),
// and inserts 3 brand-new pilot seats (munezero, sage, muhawe). Token-gated,
// single use — delete this file (and its route) immediately after running
// it once in production.
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../_lib/db.js';
import { USERS, seedUser } from '../_lib/seedData.js';

const TOKEN = 'n5cqjVZVI2bJ4byPgahllnQ-XbaVZYRS';

const RENAMES = [
  { fromUsername: 'aotieno', username: 'joan' },
  { fromUsername: 'pnjoroge', username: 'juliet' },
  { fromUsername: 'gwambui', username: 'nazziwa' },
  { fromUsername: 'kkiptoo', username: 'atukunda' },
  { fromUsername: 'matieno', username: 'luwano' },
  { fromUsername: 'jmwangi', username: 'muyinza' },
  { fromUsername: 'fchebet', username: 'ingabire' },
  { fromUsername: 'bomondi', username: 'sentomero' },
];

const NEW_USERNAMES = ['munezero', 'sage', 'muhawe'];

export default async function handler(req, res) {
  if (req.query.token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const renameResults = [];
  for (const r of RENAMES) {
    const u = USERS.find((x) => x.username === r.username);
    if (!u) {
      renameResults.push({ fromUsername: r.fromUsername, matched: false, error: 'no matching USERS entry' });
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    const pinHash = await bcrypt.hash(u.pin, 10);
    const { rows } = await query(
      `UPDATE users SET username = $1, password_hash = $2, pin_hash = $3, name = $4, surname = $5, email = $6
       WHERE username = $7 RETURNING id, username`,
      [u.username, passwordHash, pinHash, u.name, u.surname, u.email, r.fromUsername],
    );
    if (rows[0]) await query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
    renameResults.push({ fromUsername: r.fromUsername, matched: rows.length > 0, newUsername: u.username });
  }

  const insertResults = [];
  await withTransaction(async (client) => {
    for (const username of NEW_USERNAMES) {
      const u = USERS.find((x) => x.username === username);
      if (!u) {
        insertResults.push({ username, inserted: false, error: 'no matching USERS entry' });
        continue;
      }
      const { rows: existing } = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing[0]) {
        insertResults.push({ username, inserted: false, error: 'already exists' });
        continue;
      }
      await seedUser(client, u);
      insertResults.push({ username, inserted: true });
    }
  });

  return res.status(200).json({ ok: true, renameResults, insertResults });
}
