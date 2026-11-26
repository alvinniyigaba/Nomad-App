import { day, pctFromBps, ugx } from '../../money.js';
import { Badge, Empty, Notice, Panel } from '../../ui.jsx';

const STATUS_TONE = { active: 'success', proposed: 'gold', overdue: 'danger', repaid: 'neutral', written_off: 'neutral' };

/**
 * Read-only: members set up and answer their own loans in the app, and no
 * money moves through Nomad for them. This is the loan list exactly as the
 * member sees it.
 */
export default function Loans({ data }) {
  const { loans } = data.loans;
  return (
    <Panel title="Loans, as the member sees them" flush>
      <div style={{ padding: '12px 18px 0' }}>
        <Notice tone="info">Members set up and answer loans themselves in the app. Only loans everyone has accepted count toward their position.</Notice>
      </div>
      {loans.length === 0 ? (
        <Empty>No loans on record.</Empty>
      ) : (
        <table className="data" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Loan</th>
              <th>Status</th>
              <th className="num">Total due</th>
              <th className="num">Repaid</th>
              <th className="num">Outstanding</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => {
              const behind = l.plan && BigInt(l.plan.behindMinor ?? 0) > 0n ? l.plan.behindMinor : null;
              return (
                <tr key={`${l.source}-${l.id}`}>
                  <td>
                    <div className="cell-title">
                      {l.direction === 'lent' ? 'Lent to' : 'Borrowed from'} {l.counterparty}
                    </div>
                    <div className="cell-sub">
                      {l.kind === 'member' ? 'Between members' : 'Someone outside Nomad'}
                      {l.rateBps ? ` · ${pctFromBps(l.rateBps)} ${l.ratePeriod === 'year' ? 'a year' : 'a month'}` : ''}
                      {l.termMonths ? ` · ${l.termMonths} months` : ''}
                      {l.source === 'legacy' ? ' · older record' : ''}
                    </div>
                  </td>
                  <td>
                    <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</Badge>{' '}
                    {l.needsMyAnswer && <Badge tone="gold">Waiting on them</Badge>}
                    {l.pendingPayments?.some((p) => p.canConfirm) && <Badge tone="gold">Payment to confirm</Badge>}
                    {behind && <Badge tone="danger">Behind {ugx(behind)}</Badge>}
                  </td>
                  <td className="num">{ugx(l.totalDueMinor)}</td>
                  <td className="num">{ugx(l.repaidMinor)}</td>
                  <td className="num cell-title">{ugx(l.outstandingMinor)}</td>
                  <td className="muted">
                    {day(l.dueDate)}
                    {l.plan?.next && <div className="cell-sub">next {ugx(l.plan.next.amountMinor)} on {day(l.plan.next.dueDate)}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
