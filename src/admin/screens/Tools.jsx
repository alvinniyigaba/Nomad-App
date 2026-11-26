import { admin } from '../api.js';
import { Btn, Notice, Page, Panel, useAction } from '../ui.jsx';

function Outcome({ action }) {
  if (action.error) {
    return (
      <>
        <Notice tone="danger">{action.error.message}</Notice>
        {action.error.data && <pre className="json">{JSON.stringify(action.error.data, null, 2)}</pre>}
      </>
    );
  }
  if (!action.result) return null;
  const errors = action.result.errors ?? [];
  return (
    <>
      <Notice tone={errors.length ? 'warning' : 'success'}>
        Done{errors.length ? ` — ${errors.length} row${errors.length > 1 ? 's' : ''} need fixing in the sheet` : ''}.
      </Notice>
      <pre className="json">{JSON.stringify(action.result, null, 2)}</pre>
    </>
  );
}

function Tool({ title, children, run, label, confirm }) {
  const action = useAction();
  return (
    <Panel
      title={title}
      actions={
        <Btn
          variant="outline"
          size="sm"
          disabled={action.busy}
          onClick={() => {
            if (confirm && !window.confirm(confirm)) return;
            action.run(run);
          }}
        >
          {action.busy ? 'Running…' : label}
        </Btn>
      }
    >
      <p className="muted small" style={{ marginTop: 0 }}>
        {children}
      </p>
      <Outcome action={action} />
    </Panel>
  );
}

export default function Tools() {
  return (
    <Page title="Syncs & tools" subtitle="The jobs that otherwise run on their own each morning (06:00 and 06:10 UTC), and one-off maintenance. All are safe to re-run.">
      <div className="grid-2">
        <Tool title="Investments sync" label="Run now" run={() => admin('sync-investments')}>
          Reads each member's Investments tab (the INVESTMENT_SHEETS mapping in Vercel) and refreshes their holdings and today's values.
        </Tool>
        <Tool title="Savings sheet sync" label="Run now" run={() => admin('sync-sheet')}>
          Reads the published savings ledger sheet (SHEET_CSV_URL) and posts any rows not yet in the ledger. Rows already posted are skipped.
        </Tool>
        <Tool title="Apply schema" label="Apply" run={() => admin('migrate')} confirm="Apply db/schema.sql to the database? It only adds what's missing.">
          Brings the database up to date with db/schema.sql. Needed once after a deploy that adds tables or columns.
        </Tool>
        <Tool title="Copy older loans" label="Copy" run={() => admin('migrate-legacy-loans', { method: 'POST' })}>
          Copies loans entered the older way into loan agreements, once each. Already-copied loans are skipped.
        </Tool>
      </div>
    </Page>
  );
}
