import { ErrorState, Loading } from '../../components/ScreenState';
import { InkBackHeader } from '../../components/ui';
import { ARCHETYPES } from '../../data/archetypes';
import { useJourneyScreen } from './useJourneyScreen';

/** All seven stages along a dashed route, with the member's own marked. Stages sharing a level are alternatives, not steps. */
export default function TrailScreen() {
  const { status, error, refetch, model } = useJourneyScreen();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const current = model.stage;

  return (
    <div style={{ paddingBottom: 28 }}>
      <InkBackHeader stageId={current.id} title="THE TRAIL" to="/journey" note="Age sets where you start. Your balance sheet decides where you are." />

      <ol style={{ position: 'relative', listStyle: 'none', margin: 0, padding: '18px 22px 0 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: 29, top: 40, bottom: 30, borderLeft: '2px dashed var(--ochre-gold)' }} />
        {ARCHETYPES.map((a) => {
          const here = a.id === current.id;
          const passed = a.level < current.level;
          return (
            <li key={a.id} aria-current={here ? 'step' : undefined} style={{ position: 'relative' }}>
              <span
                aria-hidden="true"
                style={{ position: 'absolute', left: -26, top: 18, width: 12, height: 12, boxSizing: 'border-box', borderRadius: 8, border: `2px solid ${here ? 'var(--ochre-gold)' : a.color}`, background: here || passed ? a.color : 'var(--surface-ground)' }}
              />
              <div style={{ background: here ? 'var(--surface-ink)' : 'var(--surface-card)', borderRadius: 18, padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase', color: here ? 'var(--text-on-ink)' : 'var(--ink-green)' }}>{a.name}</span>
                  <span style={{ fontWeight: 300, fontSize: 11, color: here ? 'var(--taupe-on-ink)' : 'var(--text-body)' }}>
                    {a.level} · {a.level === 5 ? a.usualAge : `usually ${a.usualAge}`}
                  </span>
                </div>
                <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: here ? 'var(--ochre-soft)' : 'var(--text-muted)' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: a.color }} />
                  {a.people} · {a.terrain}
                  {here && ' · You are here'}
                </div>
                <div style={{ marginTop: 6, fontWeight: 300, fontSize: 12, lineHeight: 1.5, color: here ? 'var(--text-on-ink)' : 'var(--text-body)' }}>{a.story}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
