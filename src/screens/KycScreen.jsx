import { useNavigate } from 'react-router-dom';
import Button from '../components/ds/Button';
import { Loading, ErrorState } from '../components/ScreenState';
import { useKyc } from '../hooks/useKyc';

export default function KycScreen() {
  const navigate = useNavigate();
  const { status, kyc, error, refetch, markDone } = useKyc();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState message={error} onRetry={refetch} />;

  const steps = Array.from({ length: kyc.totalSteps }).map((_, i) =>
    i < kyc.step - 1 || kyc.complete ? 'done' : i === kyc.step - 1 ? 'current' : 'todo',
  );

  return (
    <div style={{ padding: '0 22px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/home')} style={{ fontWeight: 300, fontSize: 20, color: 'var(--text-muted)', lineHeight: 1, cursor: 'pointer' }}>
          ←
        </div>
        <div style={{ fontWeight: 300, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {kyc.complete ? 'Verified' : `Step ${kyc.step} of ${kyc.totalSteps}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 18 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{ flex: 1, height: 4, background: s === 'done' ? 'var(--ink-green)' : s === 'current' ? 'var(--accent-gold)' : 'var(--bone-panel)' }}
          />
        ))}
      </div>

      <div style={{ marginTop: 26, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, letterSpacing: '0.04em', lineHeight: 1.3, color: 'var(--text-heading)' }}>
        {kyc.complete ? 'YOU ARE VERIFIED' : 'CONFIRM YOUR IDENTITY'}
      </div>
      <div style={{ marginTop: 12, fontWeight: 300, fontSize: 13, lineHeight: 1.7, color: 'var(--text-body)' }}>
        {kyc.complete
          ? 'Thank you — your full limits are active.'
          : 'The regulator asks this once. It takes about two minutes, and you will not be asked again.'}
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <VerifiedRow title="Phone number" meta="0722 ••• 418 · verified" done={kyc.phoneVerified} />
        <VerifiedRow title="National ID" meta="•••••• 7431 · matched" done={kyc.idMatched} />

        {!kyc.selfieDone ? (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--accent-gold)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 11, height: 11, border: '1.4px solid var(--accent-gold)', borderRadius: 6, flex: 'none' }} />
              <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Selfie check</div>
            </div>
            <div style={{ marginTop: 16, height: 168, background: 'var(--bone-panel)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 96, height: 124, border: '1.4px dashed var(--sand-line)', borderRadius: '48px 48px 38px 38px' }} />
            </div>
            <div style={{ marginTop: 14, fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Face the light and hold still. We compare this with your ID photograph.
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="primary" size="md" full onClick={() => markDone('selfieDone')}>
                Open camera
              </Button>
            </div>
          </div>
        ) : (
          <VerifiedRow title="Selfie check" meta="Matched to your ID" done />
        )}

        {kyc.selfieDone && !kyc.sourceOfFundsDone && (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--accent-gold)', borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-heading)' }}>Source of funds</div>
            <div style={{ marginTop: 8, fontWeight: 300, fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Two quick questions about where your savings come from.
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="primary" size="md" full onClick={() => markDone('sourceOfFundsDone')}>
                Answer questions
              </Button>
            </div>
          </div>
        )}
        {kyc.sourceOfFundsDone && <VerifiedRow title="Source of funds" meta="On file" done />}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center', fontWeight: 300, fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)' }}>
        Documents are held encrypted and never shared with third parties.
      </div>
    </div>
  );
}

function VerifiedRow({ title, meta, done }) {
  return (
    <div
      style={{
        background: done ? 'var(--surface-panel)' : 'transparent',
        border: done ? 'none' : '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '17px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          background: done ? 'var(--success)' : 'transparent',
          border: done ? 'none' : '1.4px solid var(--border-default)',
          flex: 'none',
        }}
      />
      <div>
        <div style={{ fontWeight: 400, fontSize: 14, color: done ? 'var(--text-heading)' : 'var(--text-faint)' }}>{title}</div>
        <div style={{ marginTop: 5, fontWeight: 300, fontSize: 12, color: done ? 'var(--text-muted)' : 'var(--text-faint)' }}>{meta}</div>
      </div>
    </div>
  );
}
