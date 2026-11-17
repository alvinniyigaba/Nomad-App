import { requireFullSession } from './_lib/auth.js';
import { query } from './_lib/db.js';
import { answerAgreement, cancelAgreement, cancelPayment, createAgreement, decidePayment, getLoansForUser, recordPayment } from './_lib/loanAgreements.js';

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
    startDate: row.start_date,
    investedMinor: row.invested_minor?.toString() ?? null,
    status: row.status,
    sector: row.sector ?? null,
    updatedAt: row.updated_at,
    // Only populated for managedBy: 'nomad' holdings — current value and
    // YTD change are derived from this, not stored, same as the ledger.
    history: history?.map((h) => ({ date: h.snapshot_date, valueMinor: h.value_minor.toString() })) ?? null,
  };
}

const LOAN_ACTIONS = {
  create: createAgreement,
  answer: answerAgreement,
  cancel: cancelAgreement,
  'record-payment': recordPayment,
  'decide-payment': decidePayment,
  'cancel-payment': cancelPayment,
};

/**
 * The signed-in member's own off-ledger positions, after the PIN:
 * - default (GET): savings/investment holdings, written by an admin
 *   (resource=external-holdings in api/admin/index.js).
 * - ?resource=loans (GET): every loan they're on — loans between members,
 *   their private ledger of loans with people outside Nomad, and any older
 *   admin-entered loans not yet copied across.
 * - ?resource=loans (POST { action, ... }): setting up and answering loans
 *   and recording or confirming payments. Each action checks the member is
 *   on the loan; see api/_lib/loanAgreements.js.
 * All in this one function because Vercel's Hobby plan caps Serverless
 * Functions at 12. Nothing here moves money: loans are tracked, and the
 * money itself changes hands outside the app.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && !(req.method === 'POST' && req.query?.resource === 'loans')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await requireFullSession(req, res);
  if (!session) return;

  if (req.query?.resource === 'loans') {
    if (req.method === 'GET') return res.status(200).json(await getLoansForUser(session.user_id));
    const action = LOAN_ACTIONS[req.body?.action];
    if (!action) return res.status(400).json({ error: `action must be one of ${Object.keys(LOAN_ACTIONS).join(', ')}` });
    try {
      return res.status(200).json({ ok: true, ...(await action(session.user_id, req.body)) });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      if (err.code === '42P01') return res.status(503).json({ error: 'Loans between members aren’t switched on yet.' });
      throw err;
    }
  }

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
