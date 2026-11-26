import { Link, useNavigate } from 'react-router-dom';
import { admin } from '../api.js';
import { ago, dateTime, ugx } from '../money.js';
import { greeting } from '../../utils/format.js';
import { Badge, Empty, Glyph, Hero, LoadError, Loading, Page, Panel, Signed, useLoad } from '../ui.jsx';

const ATTENTION_TONE = { 'loan-overdue': 'danger', 'loan-behind': 'danger', 'loan-waiting': 'gold', kyc: 'gold', quiet: 'neutral', 'never-logged-in': 'neutral' };
const ATTENTION_RANK = { 'loan-overdue': 0, 'loan-behind': 1, 'loan-waiting': 2, kyc: 3, 'never-logged-in': 4, quiet: 5 };

export default function Overview({ me }) {
  const { data, error, loading, reload } = useLoad(() => admin('overview'), []);
  const navigate = useNavigate();

  if (error && !data) return <Page title="Overview"><LoadError error={error} onRetry={reload} /></Page>;
  if (!data) return <Loading />;

  const t = data.totals;
  const invested = BigInt(t.nomadInvestedMinor) + BigInt(t.externalInvestedMinor);
  const onRecord = BigInt(t.savingsMinor) + invested;
  const needing = data.members
    .filter((m) => m.attention.length)
    .sort((a, b) => Math.min(...a.attention.map((x) => ATTENTION_RANK[x.kind] ?? 9)) - Math.min(...b.attention.map((x) => ATTENTION_RANK[x.kind] ?? 9)));

  return (
    <div className="page">
      <Hero
        aside={
          <div className="hero-actions">
            <Link to="/members/new" className="btn btn-gold btn-lg">
              <Glyph name="add" size={16} />
              Add member
            </Link>
            <button className="btn btn-outline btn-lg" onClick={reload} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        }
      >
        <div className="hero-greeting">
          {greeting()}, {me?.name || me?.username}
        </div>
        <div className="hero-eyebrow">On record across the pilot · UGX</div>
        <div className="hero-figure">{ugx(onRecord)}</div>
        <div className="hero-chips">
          <span className="hero-chip" title="Liquid, goals and group-goal shares">
            Savings {ugx(t.savingsMinor)}
          </span>
          <span className="hero-chip" title={`Nomad ${ugx(t.nomadInvestedMinor)} · external ${ugx(t.externalInvestedMinor)}`}>
            Invested {ugx(invested)}
          </span>
          <span className="hero-chip" title={`Owed to members · ${ugx(t.owedByMembersMinor)} owed by members`}>
            Private loans {ugx(t.owedToMembersMinor)}
          </span>
          <Link to="/members" className="hero-chip">
            {data.memberCount} members · {data.activeLast30Days} active in 30 days
          </Link>
        </div>
      </Hero>

      <nav className="shortcuts" aria-label="Shortcuts">
        <Link to="/members/new" className="shortcut">
          <span className="shortcut-icon"><Glyph name="addMember" /></span>
          Add member
        </Link>
        <Link to="/members" className="shortcut">
          <span className="shortcut-icon"><Glyph name="members" /></span>
          All members
        </Link>
        <Link to="/activity" className="shortcut">
          <span className="shortcut-icon"><Glyph name="log" /></span>
          Change log
        </Link>
        <Link to="/tools" className="shortcut">
          <span className="shortcut-icon"><Glyph name="sync" /></span>
          Syncs &amp; tools
        </Link>
      </nav>

      <p className="page-sub small">Figures are informational — the same numbers members see in their app.</p>

      <div className="grid-2">
        <Panel title="Needs attention" flush actions={<span className="small muted">{needing.length} member{needing.length === 1 ? '' : 's'}</span>}>
          {needing.length === 0 ? (
            <Empty>Nothing needs a look right now.</Empty>
          ) : (
            <ul className="attention-list">
              {needing.map((m) => (
                <li key={m.username}>
                  <Link to={`/members/${m.username}`}>
                    <span className="cell-title">
                      {m.name} {m.surname}
                    </span>
                    <span className="attention-items">
                      {[...m.attention]
                        .sort((a, b) => (ATTENTION_RANK[a.kind] ?? 9) - (ATTENTION_RANK[b.kind] ?? 9))
                        .map((a) => (
                          <Badge key={a.kind} tone={ATTENTION_TONE[a.kind]}>
                            {a.text}
                          </Badge>
                        ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest entries" flush actions={<Link to="/members" className="small">All members →</Link>}>
          {data.recentEntries.length === 0 ? (
            <Empty>No ledger entries yet.</Empty>
          ) : (
            <table className="data">
              <tbody>
                {data.recentEntries.map((e) => (
                  <tr key={e.id} className="clickable" onClick={() => navigate(`/members/${e.username}`)}>
                    <td>
                      <div className="cell-title">{e.memberName}</div>
                      <div className="cell-sub">
                        {e.accountName}
                        {e.isGroup ? ' (group)' : ''} · {e.memo || e.kind}
                      </div>
                    </td>
                    <td className="num">
                      <Signed minor={e.amountMinor}>{ugx(e.amountMinor, { signed: true })}</Signed>
                      <div className="cell-sub">{dateTime(e.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel title="Largest positions" flush>
        <table className="data">
          <thead>
            <tr>
              <th>Member</th>
              <th className="num">Savings</th>
              <th className="num">Invested</th>
              <th className="num">Net worth</th>
              <th>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {[...data.members]
              .sort((a, b) => (BigInt(b.netWorthMinor) > BigInt(a.netWorthMinor) ? 1 : -1))
              .slice(0, 5)
              .map((m) => (
                <tr key={m.username} className="clickable" onClick={() => navigate(`/members/${m.username}`)}>
                  <td className="cell-title">
                    {m.name} {m.surname}
                  </td>
                  <td className="num">{ugx(m.savingsMinor)}</td>
                  <td className="num">{ugx(m.investedMinor)}</td>
                  <td className="num">{ugx(m.netWorthMinor)}</td>
                  <td className="muted">{ago(m.lastLogin)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
