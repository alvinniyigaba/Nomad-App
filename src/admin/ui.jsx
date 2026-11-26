import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data for a screen. `reload()` refetches without blanking what's already shown. */
export function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loadRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}

/** Runs one change at a time and keeps its outcome for a <Result>. */
export function useAction() {
  const [state, setState] = useState({ busy: false, error: null, result: null });
  const run = useCallback(async (fn) => {
    setState({ busy: true, error: null, result: null });
    try {
      const result = await fn();
      setState({ busy: false, error: null, result });
      return result;
    } catch (error) {
      setState({ busy: false, error, result: null });
      return undefined;
    }
  }, []);
  const reset = useCallback(() => setState({ busy: false, error: null, result: null }), []);
  return { ...state, run, reset };
}

export function Page({ title, subtitle, actions, children }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Panel({ title, actions, children, flush = false }) {
  return (
    <section className={`panel${flush ? ' panel-flush' : ''}`}>
      {(title || actions) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Btn({ variant = 'primary', size, className = '', type = 'button', ...rest }) {
  return <button type={type} className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`} {...rest} />;
}

export function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = 'info', children }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

/** The outcome of a useAction: its error, or a success line. */
export function Result({ action, success }) {
  if (action.error) return <Notice tone="danger">{action.error.message}</Notice>;
  if (action.result && success) return <Notice tone="success">{typeof success === 'function' ? success(action.result) : success}</Notice>;
  return null;
}

export function Loading({ what = 'Loading' }) {
  return <div className="loading">{what}…</div>;
}

export function LoadError({ error, onRetry }) {
  return (
    <Notice tone="danger">
      {error.message}
      {onRetry && (
        <>
          {' '}
          <button className="link-btn" onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </Notice>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** A centred dialog for forms. Closes on Escape or the backdrop. */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={`tab${active === t.id ? ' tab-active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Amount with colour for direction: money in green, out clay. */
export function Signed({ children, minor }) {
  const n = minor == null ? 0n : BigInt(minor);
  return <span className={n < 0n ? 'neg' : n > 0n ? 'pos' : ''}>{children}</span>;
}
