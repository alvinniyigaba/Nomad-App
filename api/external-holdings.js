import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';

function serialize(row, history) {
  return {
    id: row.id,
    providerName: row.provider_name,
    productType: row.product_type,
    balanceMinor: row.balance_minor?.toString() ?? null,
    interestRateBps: row.interest_rate_bps,
    termMonths: row.term_months,
    maturityDate: row.maturity_date,
    notes: row.notes,
    managedBy: row.managed_by,
    investmentCurrency: row.investment_currency,
    status: row.status,
    updatedAt: row.updated_at,
    // Only populated for managedBy: 'nomad' holdings — current value and
    // YTD change are derived from this, not stored, same as the ledger.
    history: history?.map((h) => ({ date: h.snapshot_date, valueMinor: h.value_minor.toString() })) ?? null,
  };
}

/** Read-only for the signed-in user's own rows. Entries are written by an admin — see api/admin/index.js (resource=external-holdings). */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await requireFullSession(req, res);
  if (!session) return;

  const { rows } = await query(
    'SELECT * FROM external_holdings WHERE user_id = $1 ORDER BY created_at DESC',
    [session.user_id],
  );
  const holdings = await Promise.all(
    rows.map(async (row) => {
      if (row.managed_by !== 'nomad') return serialize(row, null);
      const { rows: history } = await query(
        'SELECT value_minor, snapshot_date FROM investment_snapshots WHERE holding_id = $1 ORDER BY snapshot_date ASC',
        [row.id],
      );
      return serialize(row, history);
    }),
  );
  return res.status(200).json({ holdings });
}
