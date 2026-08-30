import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';

function serialize(row) {
  return {
    id: row.id,
    providerName: row.provider_name,
    productType: row.product_type,
    balanceMinor: row.balance_minor?.toString() ?? null,
    interestRateBps: row.interest_rate_bps,
    termMonths: row.term_months,
    maturityDate: row.maturity_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

/** Read-only for the signed-in user's own rows. Entries are written by an admin — see api/admin/external-holdings.js. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;

  const { rows } = await query(
    'SELECT * FROM external_holdings WHERE user_id = $1 ORDER BY created_at DESC',
    [session.user_id],
  );
  return res.status(200).json({ holdings: rows.map(serialize) });
}
