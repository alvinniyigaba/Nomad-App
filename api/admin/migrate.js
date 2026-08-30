// One-time: applies db/schema.sql (idempotent — CREATE TABLE IF NOT EXISTS /
// ADD COLUMN IF NOT EXISTS throughout) to production so the new group-goal
// and external-holdings tables/columns exist before the new code paths that
// depend on them go live. Token-gated, single use — delete this file (and
// its route) immediately after running it once.
import { readFileSync } from 'fs';
import { db } from '../_lib/db.js';

const TOKEN = 'opzmL8mV2cfdCUXAqZNNBPwWlDx36L-P';

export default async function handler(req, res) {
  if (req.query.token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const schemaPath = new URL('../../db/schema.sql', import.meta.url);
  const schema = readFileSync(schemaPath, 'utf-8');

  await db().query(schema);
  return res.status(200).json({ ok: true, message: 'Schema applied.' });
}
