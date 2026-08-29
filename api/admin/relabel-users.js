// One-time production patch: swap the login identity + credentials for two
// existing pilot seats (wanjiru -> Niyigaba, dmutua -> HisBabe) without
// touching their accounts/ledger/kyc rows. Token-gated, single use, delete
// this file (and its route) immediately after running it once in production.
import bcrypt from 'bcryptjs';
import { query } from '../_lib/db.js';

const TOKEN = '8SecslBTuO9XB-EA9fWALsxjN9tajtYj';

const CHANGES = [
  {
    fromUsername: 'wanjiru',
    username: 'niyigaba',
    password: 'AppTester1',
    pin: '1234',
    name: 'Niyigaba Mugisha',
    surname: 'Alvin',
    email: 'alvin.niyigaba@vinandsage.com',
  },
  {
    fromUsername: 'dmutua',
    username: 'hisbabe',
    password: 'AppTester2',
    pin: '5678',
    name: 'Namubiru Angel',
    surname: 'Kirabo',
    email: 'namubiru.angel@example.com',
  },
];

export default async function handler(req, res) {
  if (req.query.token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const results = [];
  for (const c of CHANGES) {
    const passwordHash = await bcrypt.hash(c.password, 10);
    const pinHash = await bcrypt.hash(c.pin, 10);
    const { rows } = await query(
      `UPDATE users SET username = $1, password_hash = $2, pin_hash = $3, name = $4, surname = $5, email = $6
       WHERE username = $7 RETURNING id, username`,
      [c.username, passwordHash, pinHash, c.name, c.surname, c.email, c.fromUsername],
    );
    if (rows[0]) await query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
    results.push({ fromUsername: c.fromUsername, matched: rows.length > 0, newUsername: c.username });
  }

  return res.status(200).json({ ok: true, results });
}
