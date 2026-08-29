// ONE-TIME production bootstrap: applies db/schema.sql then seeds the 10
// pilot users. Gated by a hardcoded token (not an env var — this file is
// deleted immediately after its one use, so there's nothing left to gate).
// Do NOT leave this deployed longer than it takes to run it once — it
// TRUNCATEs every table it touches.
import { readFileSync } from 'fs';
import { db } from '../_lib/db.js';
import { seedDatabase } from '../_lib/seedData.js';

const SETUP_TOKEN = '5arzaCXrF2NqyGOKr9lquxUu6kYRcryZ';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.query.token !== SETUP_TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const schemaPath = new URL('../../db/schema.sql', import.meta.url);
  const schema = readFileSync(schemaPath, 'utf-8');
  await db().query(schema);

  const client = await db().connect();
  let credentials;
  try {
    credentials = await seedDatabase(client);
  } finally {
    client.release();
  }

  return res.status(200).json({ ok: true, credentials });
}
