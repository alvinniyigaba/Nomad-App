import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin } from '../api.js';
import { ago, ugx } from '../money.js';
import { Badge, Empty, LoadError, Loading, Page, Panel, useLoad } from '../ui.jsx';

const SORTS = {
  name: { label: 'Name', cmp: (a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`) },
  net: { label: 'Net worth', cmp: (a, b) => cmpBig(b.netWorthMinor, a.netWorthMinor) },
  savings: { label: 'Savings', cmp: (a, b) => cmpBig(b.savingsMinor, a.savingsMinor) },
  invested: { label: 'Invested', cmp: (a, b) => cmpBig(b.investedMinor, a.investedMinor) },
  login: { label: 'Last sign-in', cmp: (a, b) => new Date(b.lastLogin ?? 0) - new Date(a.lastLogin ?? 0) },
  attention: { label: 'Needs attention', cmp: (a, b) => b.attention.length - a.attention.length },
};

function cmpBig(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x > y ? 1 : -1;
}

export default function Members() {
  const { data, error, reload } = useLoad(() => admin('overview'), []);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.members
      .filter((m) => !needle || `${m.name} ${m.surname} ${m.username} ${m.email}`.toLowerCase().includes(needle))
      .sort(SORTS[sort].cmp);
  }, [data, q, sort]);

  if (error && !data) return <Page title="Members"><LoadError error={error} onRetry={reload} /></Page>;
  if (!data) return <Loading />;

  return (
    <Page
      title="Members"
      subtitle={`${data.memberCount} members in the pilot`}
      actions={
        <Link to="/members/new" className="btn btn-primary">
          Add member
        </Link>
      }
    >
      <div className="toolbar">
        <input className="search" placeholder="Search name, username or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="small muted">
          Sort by{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Panel flush>
        {rows.length === 0 ? (
          <Empty>No member matches “{q}”.</Empty>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Member</th>
                <th className="num">Savings</th>
                <th className="num">Invested</th>
                <th className="num">Loans (net)</th>
                <th className="num">Net worth</th>
                <th>KYC</th>
                <th>Last sign-in</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const loanNet = BigInt(m.owedToYouMinor) - BigInt(m.youOweMinor);
                return (
                  <tr key={m.username} className="clickable" onClick={() => navigate(`/members/${m.username}`)}>
                    <td>
                      <div className="cell-title">
                        {m.name} {m.surname} {m.isStaff && <Badge tone="ink">Admin</Badge>}
                      </div>
                      <div className="cell-sub">@{m.username}</div>
                    </td>
                    <td className="num">{ugx(m.savingsMinor)}</td>
                    <td className="num">{ugx(m.investedMinor)}</td>
                    <td className="num">{m.openLoans ? ugx(loanNet, { signed: true }) : <span className="muted">—</span>}</td>
                    <td className="num cell-title">{ugx(m.netWorthMinor)}</td>
                    <td>
                      <Badge tone={m.kycStepsDone === 4 ? 'success' : 'gold'}>{m.kycStepsDone}/4</Badge>
                    </td>
                    <td className="muted">{ago(m.lastLogin)}</td>
                    <td>{m.attention.length ? <Badge tone="gold">{m.attention.length}</Badge> : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </Page>
  );
}
