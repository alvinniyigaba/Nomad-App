import { ErrorState, Loading } from '../../components/ScreenState';
import { Eyebrow, InkBackHeader, PillButton, SoftCard, Tag } from '../../components/ui';
import { HOME_CURRENCY } from '../../config/journeyRules';
import { useMoney } from '../../hooks/useMoney';
import { fromMinor } from '../../utils/format';
import { externalInvestedMinor, totalInvestedMinor } from '../../utils/investmentSeries';
import { compactMinor, percent } from './format';
import { useJourneyScreen } from './useJourneyScreen';

const CATEGORY_LABEL = { household: 'Household and food', rent: 'Rent', school_fees: 'School fees', medical: 'Medical', transport: 'Transport', other: 'Other' };
const FREQUENCY_NOTE = { monthly: 'Monthly', termly: 'a term', yearly: 'a year' };

// Where a figure comes from, so a member can tell a ledger balance from a
// number Nomad typed in or an estimate.
const SOURCE = {
  auto: <Tag>AUTO</Tag>,
  nomad: <Tag color="var(--accent-clay)">NOMAD</Tag>,
  estimate: <Tag color="var(--text-muted)">EST.</Tag>,
};

function Section({ title, total, hint, children }) {
  return (
    <SoftCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <Eyebrow>{title}</Eyebrow>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-heading)' }}>{total}</div>
      </div>
      <div style={{ marginTop: 2, fontWeight: 300, fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </SoftCard>
  );
}

function Line({ label, note, source, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--surface-panel)', fontSize: 13 }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-heading)' }}>{label}</div>
        {note && <div style={{ marginTop: 2, fontWeight: 300, fontSize: 11, color: 'var(--text-body)' }}>{note}</div>}
      </div>
      {SOURCE[source]}
      <div style={{ minWidth: 84, textAlign: 'right', fontWeight: 500, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ padding: '10px 0 2px', borderTop: '1px solid var(--surface-panel)', fontWeight: 300, fontSize: 12, lineHeight: 1.55, color: 'var(--text-body)' }}>{children}</div>;
}

/**
 * The member's personal balance sheet: what they own and owe (from their
 * accounts, holdings and loans), and their monthly income and costs (as
 * recorded by Nomad). Read-only for now — the add button is shown but
 * switched off until members can enter figures themselves.
 */
export default function BalanceSheetScreen() {
  const { status, error, refetch, model, holdings } = useJourneyScreen();
  const { fmt, ksh, hidden } = useMoney();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const { stage, position, expenses, income, expensesMonthlyMinor, holdingsIncomeMinor, activeIncomeMinor, passiveIncomeMinor, independence, hasCosts } = model;
  const money = (minor) => fmt(fromMinor(minor));
  const nomadMinor = totalInvestedMinor(holdings);
  const externalMinor = externalInvestedMinor(holdings);

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkBackHeader stageId={stage.id} title="BALANCE SHEET" to="/journey" />

      <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: stage.color, color: stage.onColor, borderRadius: 20, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.22em' }}>NET WORTH · {HOME_CURRENCY}</div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24 }}>{hidden ? fmt(0) : compactMinor(position.netWorthMinor)}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.22em' }}>INDEPENDENCE</div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24 }}>{independence == null ? '—' : percent(independence)}</div>
          </div>
        </div>

        <Section title="What you own" total={money(position.assetsMinor)} hint="From your accounts with Nomad and your holdings on record">
          <Line label="Liquid fund" note="Your runway" source="auto" value={money(position.liquidMinor)} />
          {position.goalsMinor > 0 && <Line label="Savings goals" source="auto" value={money(position.goalsMinor)} />}
          {position.groupMinor > 0 && <Line label="Group goals" note="Your own contributions" source="auto" value={money(position.groupMinor)} />}
          {nomadMinor > 0 && <Line label="Investments with Nomad" source="auto" value={money(nomadMinor)} />}
          {externalMinor > 0 && <Line label="Investments on record" note="Held elsewhere" source="nomad" value={money(externalMinor)} />}
          {position.owedToYouMinor > 0 && <Line label="Owed to you" note="Private loans" source="nomad" value={money(position.owedToYouMinor)} />}
        </Section>

        <Section title="What you owe" total={money(position.youOweMinor)} hint="Private loans on record">
          {position.youOweMinor > 0 ? <Line label="Private loans you owe" source="nomad" value={money(position.youOweMinor)} /> : <Empty>Nothing on record.</Empty>}
        </Section>

        <Section title="Income each month" total={money(activeIncomeMinor + passiveIncomeMinor)} hint="Passive income counts toward independence">
          {income.map((i) => (
            <Line key={i.label} label={i.label} note={i.kind === 'passive' ? 'Passive' : 'Active'} source="nomad" value={money(i.monthlyMinor)} />
          ))}
          {holdingsIncomeMinor > 0 && <Line label="Investment income" note="Passive · projected from the rates on record" source="estimate" value={money(holdingsIncomeMinor)} />}
          {income.length === 0 && <Empty>Your salary and other income aren’t on record yet. Send them to Nomad and they appear here.</Empty>}
        </Section>

        <Section title="Day-to-day costs each month" total={hasCosts ? money(expensesMonthlyMinor) : '—'} hint="What independence has to cover">
          {expenses.map((e) => (
            <Line key={e.category} label={CATEGORY_LABEL[e.category]} note={e.frequency === 'monthly' ? FREQUENCY_NOTE.monthly : `${ksh(fromMinor(e.amountMinor))} ${FREQUENCY_NOTE[e.frequency]}`} source="nomad" value={money(e.monthlyMinor)} />
          ))}
          {!hasCosts && <Empty>Not on record yet. Send Nomad your monthly household, rent, school fees, medical and transport costs. Totals only: we never record who a cost is for.</Empty>}
        </Section>

        <PillButton icon="add" disabled>Add a cost or income</PillButton>
        <div style={{ fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-body)' }}>
          Adding these yourself is coming. For now Nomad enters them for you. All amounts are in {HOME_CURRENCY}. Only you and the Nomad team see this page, and it hides with your balances.
        </div>
      </div>
    </div>
  );
}
