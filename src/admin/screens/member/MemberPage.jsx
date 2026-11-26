import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { admin } from '../../api.js';
import { ago, dateTime, ugx } from '../../money.js';
import { MAX_LEVEL } from '../../../data/archetypes.js';
import { memberJourney } from '../../stage.js';
import { Badge, Empty, Hero, LoadError, Loading, Page, Panel, RouteBar, Tabs, useLoad } from '../../ui.jsx';
import Accounts from './Accounts.jsx';
import Investments from './Investments.jsx';
import Loans from './Loans.jsx';
import Finances from './Finances.jsx';
import Profile from './Profile.jsx';
import Access from './Access.jsx';

/** The member's position, split the way their own Home screen shows it. */
function position(data) {
  const own = data.accounts.filter((a) => !a.isGroup && !a.closedAt);
  const ownMinor = own.reduce((sum, a) => sum + BigInt(a.balanceMinor), 0n);
  const groupMinor = data.accounts.filter((a) => a.isGroup).reduce((sum, a) => sum + BigInt(a.myShareMinor ?? 0), 0n);
  const investedMinor = data.holdings.filter((h) => h.status === 'active' && h.valueMinor != null).reduce((sum, h) => sum + BigInt(h.valueMinor), 0n);
  const owedToYou = BigInt(data.loans.totals.owedToYouMinor);
  const youOwe = BigInt(data.loans.totals.youOweMinor);
  const savings = ownMinor + groupMinor;
  return { savings, groupMinor, investedMinor, owedToYou, youOwe, net: savings + investedMinor + owedToYou - youOwe };
}

const PLACED_BY = {
  override: 'Set by Nomad',
  balance_sheet: 'Placed by balance sheet',
  age: 'Placed by age — no costs on record yet',
  default: 'Starting point — no costs on record yet',
};

/** Where the member is on the trail, worked out exactly as their app does. */
function StageCard({ data, onOpen }) {
  let model;
  try {
    model = memberJourney(data);
  } catch {
    return null;
  }
  const { stage, independence, placement } = model;
  return (
    <section className="stage-card" aria-label="Stage on the trail">
      <div className="hero-eyebrow" style={{ marginTop: 0 }}>
        On the trail
      </div>
      <div className="stage-top">
        <div>
          <div className="stage-name">{stage.name}</div>
          <div className="stage-sub">
            Stage {stage.level} of {MAX_LEVEL} · {stage.terrain}
          </div>
        </div>
        <div className="stage-pct">
          {independence == null ? '—' : `${Math.round(independence * 100)}%`}
          <small>independent</small>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <RouteBar value={independence} onInk />
      </div>
      <div className="stage-foot">
        <span>{PLACED_BY[placement.source] ?? ''}</span>
        <button type="button" onClick={onOpen}>
          Costs, income &amp; stage →
        </button>
      </div>
    </section>
  );
}

export default function MemberPage() {
  const { username } = useParams();
  const [tab, setTab] = useState('savings');
  const { data, error, reload } = useLoad(() => admin('member', { params: { username } }), [username]);

  if (error && !data) {
    return (
      <Page title="Member">
        <LoadError error={error} onRetry={reload} />
        <Link to="/members">← All members</Link>
      </Page>
    );
  }
  if (!data || data.profile.username !== username) return <Loading />;

  const p = data.profile;
  const pos = position(data);
  const openAccounts = data.accounts.filter((a) => !a.closedAt).length;
  const activeHoldings = data.holdings.filter((h) => h.status === 'active').length;
  const tabs = [
    { id: 'savings', label: 'Savings', count: openAccounts },
    { id: 'investments', label: 'Investments', count: activeHoldings },
    { id: 'loans', label: 'Loans', count: data.loans.loans.length },
    { id: 'finances', label: 'Costs, income & stage' },
    { id: 'profile', label: 'Profile' },
    { id: 'access', label: 'Access & KYC' },
    { id: 'history', label: 'Change log', count: data.audit.length },
  ];
  const props = { data, username, reload };

  return (
    <div className="page">
      <Hero aside={<StageCard data={data} onOpen={() => setTab('finances')} />}>
        <div className="hero-crumb">
          <Link to="/members">Members</Link> / @{p.username} {p.staffRole && <span className="hero-tag">Admin</span>}
        </div>
        <h1 className="hero-title">
          {p.name} {p.surname}
        </h1>
        <div className="hero-meta">
          Member since {p.memberSince ?? '—'} · last sign-in {ago(data.logins.last_login)}
        </div>
        <div className="hero-eyebrow">Net worth · UGX</div>
        <div className="hero-figure" title="Savings + invested + owed to them − owed by them">
          {ugx(pos.net)}
        </div>
        <div className="hero-chips">
          <span className="hero-chip" title={pos.groupMinor ? `includes ${ugx(pos.groupMinor)} share of group goals` : 'Liquid and goals'}>
            Savings {ugx(pos.savings)}
          </span>
          <span className="hero-chip" title={`${activeHoldings} active holding${activeHoldings === 1 ? '' : 's'}`}>
            Invested {ugx(pos.investedMinor)}
          </span>
          <span className="hero-chip" title={`${ugx(pos.owedToYou)} owed to them · ${ugx(pos.youOwe)} they owe`}>
            Loans {ugx(pos.owedToYou - pos.youOwe, { signed: true })}
          </span>
        </div>
      </Hero>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'savings' && <Accounts {...props} />}
      {tab === 'investments' && <Investments {...props} />}
      {tab === 'loans' && <Loans {...props} />}
      {tab === 'finances' && <Finances {...props} />}
      {tab === 'profile' && <Profile {...props} />}
      {tab === 'access' && <Access {...props} />}
      {tab === 'history' && (
        <Panel flush actions={<Link to="/activity" className="small">Full change log →</Link>} title="Changes made to this member">
          {data.audit.length === 0 ? (
            <Empty>No admin changes recorded for this member yet.</Empty>
          ) : (
            <table className="data">
              <tbody>
                {data.audit.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{dateTime(a.createdAt)}</td>
                    <td>{a.actorUsername ? `@${a.actorUsername}` : a.actorKind}</td>
                    <td className="cell-title">
                      {a.resource} <span className="muted small">{a.method}</span>
                    </td>
                    <td>
                      <Badge tone={a.status < 300 ? 'success' : 'danger'}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
    </div>
  );
}
