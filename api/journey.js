import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';
import { journeyEnabled } from './_lib/features.js';

// Postgres codes for "relation does not exist" / "column does not exist".
// The journey tables arrive with a migration that is run by hand after the
// code deploys, so until then this endpoint answers "nothing on record"
// instead of failing.
const NOT_MIGRATED = new Set(['42P01', '42703']);

async function rowsOrEmpty(text, params) {
  try {
    const { rows } = await query(text, params);
    return rows;
  } catch (err) {
    if (NOT_MIGRATED.has(err.code)) return [];
    throw err;
  }
}

/**
 * Read-only: what Nomad has on record about the signed-in member's costs
 * and income, plus any stage override. The current figure for each cost
 * category / income label is its latest row; a zero amount means retired
 * and is left out. Stage, independence and spread are derived on the
 * client from this and the accounts/holdings/loans endpoints — nothing
 * here is a stored total. effective_from is selected as text: read as a
 * JS Date it would shift a day wherever the server isn't on UTC.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;
  if (!journeyEnabled(session.username)) return res.status(404).json({ error: 'Not found' });

  const [expenses, income, placements] = await Promise.all([
    rowsOrEmpty(
      `SELECT DISTINCT ON (category) category, amount_minor, frequency, effective_from::text AS effective_from
       FROM member_expenses WHERE user_id = $1
       ORDER BY category, effective_from DESC, created_at DESC`,
      [session.user_id],
    ),
    rowsOrEmpty(
      `SELECT DISTINCT ON (label) label, kind, amount_minor, frequency, effective_from::text AS effective_from
       FROM member_income WHERE user_id = $1
       ORDER BY label, effective_from DESC, created_at DESC`,
      [session.user_id],
    ),
    rowsOrEmpty(
      'SELECT archetype, created_at FROM archetype_placements WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [session.user_id],
    ),
  ]);

  return res.status(200).json({
    expenses: expenses
      .filter((r) => Number(r.amount_minor) > 0)
      .map((r) => ({ category: r.category, amountMinor: r.amount_minor.toString(), frequency: r.frequency, effectiveFrom: r.effective_from })),
    income: income
      .filter((r) => Number(r.amount_minor) > 0)
      .map((r) => ({ label: r.label, kind: r.kind, amountMinor: r.amount_minor.toString(), frequency: r.frequency, effectiveFrom: r.effective_from })),
    stageOverride: placements[0]?.archetype ?? null,
  });
}
