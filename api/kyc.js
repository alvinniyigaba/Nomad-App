import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';

const TOTAL_STEPS = 4;
const FIELDS = ['phone_verified', 'id_matched', 'selfie_done', 'source_of_funds_done'];

function serialize(row) {
  const doneCount = FIELDS.filter((f) => row[f]).length;
  return {
    phoneVerified: row.phone_verified,
    idMatched: row.id_matched,
    selfieDone: row.selfie_done,
    sourceOfFundsDone: row.source_of_funds_done,
    step: Math.min(doneCount + (doneCount < TOTAL_STEPS ? 1 : 0), TOTAL_STEPS),
    totalSteps: TOTAL_STEPS,
    complete: doneCount === TOTAL_STEPS,
  };
}

const PATCHABLE = { selfieDone: 'selfie_done', sourceOfFundsDone: 'source_of_funds_done' };

export default async function handler(req, res) {
  const session = await requireFullSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { rows } = await query('SELECT * FROM kyc_status WHERE user_id = $1', [session.user_id]);
    return res.status(200).json(serialize(rows[0]));
  }

  if (req.method === 'PATCH') {
    const { field, value } = req.body ?? {};
    const column = PATCHABLE[field];
    if (!column || typeof value !== 'boolean') {
      return res.status(400).json({ error: 'field must be selfieDone or sourceOfFundsDone, value must be boolean' });
    }
    const { rows } = await query(
      `UPDATE kyc_status SET ${column} = $1, updated_at = now() WHERE user_id = $2 RETURNING *`,
      [value, session.user_id],
    );
    return res.status(200).json(serialize(rows[0]));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
