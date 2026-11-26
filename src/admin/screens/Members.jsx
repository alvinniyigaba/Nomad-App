import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admin } from '../api.js';
import { ago, ugx } from '../money.js';
import { Badge, Empty, Glyph, LoadError, Loading, Page, Panel, useLoad } from '../ui.jsx';

const SORTS = {
  name: { label: 'Name', cmp: (a, b) => `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`) },
  net: { label: 'Net worth', cmp: (a, b) => cmpBig(b.netWorthMinor, a.netWorthMinor) },
  savings: { label: 'Savings', cmp: (a, b) => cmpBig(b.savingsMinor, a.savingsMinor) },
  invested: { label: 'Invested', cmp: (a, b) => cmpBig(b.investedMinor, a.investedMinor) },
  login: { label: 'Last sign-in', cmp: (a, b) => new Date(b.lastLogin ?? 0) - new Date(a.lastLogin ?? 0) },
  attention: { label: 'Needs attention', cmp: (a, b) => b.attention.length - a.attention.length },
};

/** Quick filters above the table; each is a plain test on the overview row. */
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'attention', label: 'Needs attention', test: (m) => m.attention.length > 0 },
  { id: 'kyc', label: 'KYC incomplete', test: (m) => m.kycStepsDone < 4 },
  { id: 'loans', label: 'Open loans', test: (m) => m.openLoans > 0 },
  { id: 'never', label: 'Never signed in', test: (m) => !m.lastLogin },
];

const ATTENTION_TONE = { 'loan-overdue': 'danger', 'loan-behind': 'danger', 'loan-waiting': 'gold', kyc: 'gold', quiet: 'neutral', 'never-logged-in': 'neutral' };
const ATTENTION_RANK = { 'loan-overdue': 0, 'loan-behind': 1, 'loan-waiting': 2, kyc: 3, 'never-logged-in': 4, quiet: 5 };

function cmpBig(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x > y ? 1 : -1;
}

/** Savings / invested / private loans as shares of everything on record. */
function Split({ totals }) {
  const parts = [
    { label: 'Savings', minor: BigInt(totals.savingsMinor), color: 'var(--ink-green)' },
    { label: 'Invested', minor: BigInt(totals.nomadInvestedMinor) + BigInt(totals.externalInvestedMinor), color: 'var(--ochre-gold)' },
    { label: 'Lent privately', minor: BigInt(totals.owedToMembersMinor), color: 'var(--clay-soft)' },
  ];
  const sum = parts.reduce((s, p) => s + p.minor, 0n);
  return (
    <div className="split">
      <div className="split-head">
        <span>On record {ugx(sum)}</span>
      </div>
      <div className="split-bar" role="img" aria-label={parts.map((p) => `${p.label} ${ugx(p.minor)}`).join(', ')}>
        {sum > 0n && parts.map((p) => p.minor > 0n && <div key={p.label} style={{ flex: Number((p.minor * 1000n) / sum), background: p.color }} />)}
      </div>
      <div className="split-key">
        {parts.map((p) => (
          <span key={p.label} style={{ '--dot': p.color }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function KycDots({ done }) {
  return (
    <span className="kyc-dots" role="img" aria-label={`KYC ${done} of 4 steps`} title={`${done}/4 KYC steps`}>
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < done ? 'on' : ''} />
      ))}
    </span>
  );
}

export default function Members() {
  const { data, error, reload, loading } = useLoad(() => admin('overview'), []);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter).test;
    return data.members
      .filter(test)
      .filter((m) => !needle || `${m.name} ${m.surname} ${m.username} ${m.email}`.toLowerCase().includes(needle))
      .sort(SORTS[sort].cmp);
  }, [data, q, sort, filter]);

  if (error && !data) return <Page title="Members"><LoadError error={error} onRetry={reload} /></Page>;
  if (!data) return <Loading />;

  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, data.members.filter(f.test).length]));

  return (
    <div className="with-command-bar">
      <Page title="Members" subtitle={`${data.memberCount} members in the pilot · ${data.activeLast30Days} signed in within 30 days`} actions={<Split totals={data.totals} />}>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? ' chip-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} {counts[f.id]}
            </button>
          ))}
          <label className="sort">
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
            <Empty>{q ? `No member matches “${q}”.` : 'No members in this view.'}</Empty>
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
                  const top = [...m.attention].sort((a, b) => (ATTENTION_RANK[a.kind] ?? 9) - (ATTENTION_RANK[b.kind] ?? 9))[0];
                  return (
                    <tr key={m.username} className="clickable" onClick={() => navigate(`/members/${m.username}`)}>
                      <td>
                        <div className="who">
                          <span className={`avatar${m.isStaff ? ' avatar-ink' : ''}`}>{(m.name || m.username).charAt(0).toUpperCase()}</span>
                          <div>
                            <div className="cell-title">
                              {m.name} {m.surname} {m.isStaff && <Badge tone="ink">Admin</Badge>}
                            </div>
                            <div className="cell-sub">@{m.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{ugx(m.savingsMinor)}</td>
                      <td className="num">{ugx(m.investedMinor)}</td>
                      <td className={`num${loanNet < 0n ? ' neg' : loanNet > 0n ? ' pos' : ''}`}>{m.openLoans ? ugx(loanNet, { signed: true }) : <span className="muted">—</span>}</td>
                      <td className="num worth">{ugx(m.netWorthMinor)}</td>
                      <td>
                        <KycDots done={m.kycStepsDone} />
                      </td>
                      <td className="muted">{ago(m.lastLogin)}</td>
                      <td>
                        {top ? (
                          <span title={m.attention.map((a) => a.text).join(' · ')}>
                            <Badge tone={ATTENTION_TONE[top.kind]}>{top.text}</Badge>
                            {m.attention.length > 1 && <span className="small muted"> +{m.attention.length - 1}</span>}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </Page>

      <div className="command-bar">
        <label>
          <Glyph name="search" size={16} />
          <input aria-label="Search name, username or email" placeholder="Search name, username or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn btn-ghost" onClick={reload} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <Link to="/members/new" className="btn btn-gold">
          <Glyph name="add" size={16} />
          Add member
        </Link>
      </div>
    </div>
  );
}
