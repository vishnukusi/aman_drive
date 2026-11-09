import { useEffect, useState } from 'react';
import { STATUS_TONE } from '../config.js';

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_TONE[status] || 'grey'}`}>{status}</span>;
}

export function SimBadge() {
  return <span className="badge sim" title="Simulated demo data">Simulated</span>;
}

/** Shows the business's own photo; falls back to a plain label if the image cannot load. */
export function CarImage({ vehicle, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [vehicle.image]);
  return (
    <div className={`vimg ${className}`}>
      {!failed && vehicle.image ? (
        <img src={vehicle.image} alt={vehicle.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="fallback">{vehicle.name}<br />(photo unavailable offline)</div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function EstimateBox({ est, compact }) {
  if (!est) return null;
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  return (
    <div className="est">
      <div className="small muted" style={{ color: '#7a5200' }}>Indicative estimate</div>
      <div className="big">{inr(est.amount)}</div>
      {!compact && (
        <ul>
          {est.lines.map((l, i) => (
            <li key={i}><span>{l.label}</span><span>{inr(l.amount)}</span></li>
          ))}
        </ul>
      )}
      <p className="small" style={{ marginTop: 8, color: '#6a4a10' }}>
        Based on rates published on amanselfdrivecars.com. Fuel, tolls and refundable security deposit are not included.
        Final rental quotation is subject to confirmation by Aman Self Drive.
      </p>
      {est.notes.map((n, i) => (
        <p key={i} className="small" style={{ marginTop: 4, color: '#6a4a10' }}>{n}</p>
      ))}
    </div>
  );
}
