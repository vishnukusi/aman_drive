import { useEffect, useRef, useState } from 'react';
import { STATUS_TONE } from '../config.js';
import { useReveal } from '../lib/motion.js';

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_TONE[status] || 'grey'}`}>{status}</span>;
}

export function SimBadge() {
  return <span className="badge sim" title="Simulated demo data">Simulated</span>;
}

/**
 * Shows the business's own photo (self-hosted WebP, 480 px + 960 px) with explicit dimensions so cards do not shift
 * while loading. Falls back to a plain label if the image cannot load (e.g. an admin-entered URL that is broken).
 */
export function CarImage({ vehicle, className = '', sizes = '(min-width: 1100px) 340px, (min-width: 700px) 45vw, 92vw', eager = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [vehicle.image]);
  const srcSet = vehicle.imageLarge ? `${vehicle.image} 480w, ${vehicle.imageLarge} 960w` : undefined;
  return (
    <div className={`vimg ${className}`}>
      {!failed && vehicle.image ? (
        <img
          src={vehicle.image}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          width="480"
          height="320"
          alt={`${vehicle.name} from the Aman Self Drive fleet`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="fallback">{vehicle.name}<br />(photo unavailable)</div>
      )}
    </div>
  );
}

/** Wraps a block so it animates in when scrolled into view (see useReveal). */
export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHead({ eyebrow, title, children, center, light }) {
  return (
    <Reveal className={`section-head${center ? ' center' : ''}${light ? ' light' : ''}`}>
      {eyebrow && <div className="eyebrow" data-stagger>{eyebrow}</div>}
      <h2 data-stagger>{title}</h2>
      {children && <p data-stagger>{children}</p>}
    </Reveal>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // Keep keyboard focus inside the dialog.
      if (e.key === 'Tab' && boxRef.current) {
        const f = boxRef.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.querySelector('.x')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener && opener.focus) opener.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={boxRef} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
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
