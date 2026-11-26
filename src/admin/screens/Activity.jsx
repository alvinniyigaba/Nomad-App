import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../api.js';
import { dateTime } from '../money.js';
import { Badge, Empty, LoadError, Loading, Notice, Page, Panel, useLoad } from '../ui.jsx';

const ACTOR = { staff: 'Console', token: 'Admin token', cron: 'Daily sync' };

export default function Activity() {
  const [username, setUsername] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);
  const { data, error, reload } = useLoad(() => admin('audit-log', { params: { limit: 200, ...(filter && { username: filter }) } }), [filter]);

  if (error && !data) return <Page title="Change log"><LoadError error={error} onRetry={reload} /></Page>;
  if (!data) return <Loading />;

  return (
    <Page title="Change log" subtitle="Every change made through the admin API — from this console, the admin token or the daily syncs. Passwords and PINs are never recorded.">
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter(username.trim().toLowerCase());
        }}
      >
        <input className="search" placeholder="Filter by member username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button className="btn btn-outline" type="submit">
          Filter
        </button>
        {filter && (
          <button
            className="link-btn"
            type="button"
            onClick={() => {
              setUsername('');
              setFilter('');
            }}
          >
            Clear
          </button>
        )}
      </form>
      {data.notSetUp && <Notice tone="warning">The change log table doesn't exist yet — run “Apply schema” under Syncs &amp; tools.</Notice>}
      <Panel flush>
        {data.entries.length === 0 ? (
          <Empty>No changes recorded{filter ? ` for ${filter}` : ''} yet.</Empty>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Member</th>
                <th>Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td className="muted">{dateTime(e.createdAt)}</td>
                    <td>{e.actorUsername ? `@${e.actorUsername}` : ACTOR[e.actorKind]}</td>
                    <td>
                      <span className="cell-title">{e.resource}</span> <span className="muted small">{e.method}</span>
                    </td>
                    <td>{e.targetUsername ? <Link to={`/members/${e.targetUsername}`}>@{e.targetUsername}</Link> : <span className="muted">—</span>}</td>
                    <td>
                      <Badge tone={e.status < 300 ? 'success' : 'danger'}>{e.status}</Badge>
                    </td>
                    <td className="num">
                      <button className="link-btn small" onClick={() => setOpen(open === e.id ? null : e.id)}>
                        {open === e.id ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {open === e.id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="grid-2">
                          <div>
                            <div className="field-label">Request</div>
                            <pre className="json">{JSON.stringify(e.request, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="field-label">Response</div>
                            <pre className="json">{JSON.stringify(e.response, null, 2)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Page>
  );
}
