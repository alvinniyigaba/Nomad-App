import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { admin } from '../../api.js';
import { ago, dateTime, ugx } from '../../money.js';
import { Badge, Empty, LoadError, Loading, Page, Panel, Stat, Tabs, useLoad } from '../../ui.jsx';
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
    <Page
      title={`${p.name} ${p.surname}`}
      subtitle={
        <>
          <Link to="/members">Members</Link> / @{p.username} · member since {p.memberSince} · last sign-in {ago(data.logins.last_login)}{' '}
          {p.staffRole && <Badge tone="ink">Admin</Badge>}
        </>
      }
    >
      <div className="stats">
        <Stat tone="ink" label="Net worth" value={ugx(pos.net)} hint="Savings + invested + owed to them − owed by them" />
        <Stat label="Savings" value={ugx(pos.savings)} hint={pos.groupMinor ? `includes ${ugx(pos.groupMinor)} share of group goals` : 'Liquid and goals'} />
        <Stat label="Invested" value={ugx(pos.investedMinor)} hint={`${activeHoldings} active holding${activeHoldings === 1 ? '' : 's'}`} />
        <Stat label="Loans" value={ugx(pos.owedToYou - pos.youOwe, { signed: true })} hint={`${ugx(pos.owedToYou)} owed to them · ${ugx(pos.youOwe)} they owe`} />
      </div>

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
    </Page>
  );
}
