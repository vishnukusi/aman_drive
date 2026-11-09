import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { CATEGORIES, transmissionKind } from '../data/vehicles.js';
import VehicleCard from '../components/VehicleCard.jsx';
import VehicleDetails from '../components/VehicleDetails.jsx';

const PRICE_BANDS = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u2', label: 'Up to ₹2,000', test: (p) => p <= 2000 },
  { id: 'm', label: '₹2,001 – ₹3,500', test: (p) => p > 2000 && p <= 3500 },
  { id: 'o', label: 'Above ₹3,500', test: (p) => p > 3500 },
];

export default function Cars() {
  const { vehicles } = useStore();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [details, setDetails] = useState(null);

  const category = params.get('category') || 'all';
  const trans = params.get('trans') || 'any';
  const band = params.get('price') || 'any';

  const set = (k, v, def) => {
    const next = new URLSearchParams(params);
    v === def ? next.delete(k) : next.set(k, v);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const b = PRICE_BANDS.find((x) => x.id === band) || PRICE_BANDS[0];
    return vehicles
      .filter((v) => v.visible)
      .filter((v) => category === 'all' || v.category === category)
      .filter((v) => {
        if (trans === 'any') return true;
        const k = transmissionKind(v);
        return trans === 'automatic' ? k.automatic : k.manual;
      })
      .filter((v) => b.test(v.rate24))
      .sort((a, b2) => a.rate24 - b2.rate24);
  }, [vehicles, category, trans, band]);

  const select = (v) => nav(`/book?car=${v.id}`);

  return (
    <div className="container section">
      <div className="section-head">
        <h2>Our cars</h2>
        <p>
          Names, photos and 24-hour rates are taken from Aman Self Drive’s website. Showing a car here does not mean it is free on your
          dates — the team confirms availability.
        </p>
      </div>

      <div className="filters">
        <div className="filter-row">
          <span className="filter-label">Type</span>
          {['all', ...CATEGORIES].map((c) => (
            <button key={c} className="pill" aria-pressed={category === c} onClick={() => set('category', c, 'all')}>
              {c === 'all' ? 'All' : c === 'MPV' ? 'MPV / 7-seater' : c}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">Transmission</span>
          {[['any', 'Any'], ['automatic', 'Automatic'], ['manual', 'Manual']].map(([id, label]) => (
            <button key={id} className="pill" aria-pressed={trans === id} onClick={() => set('trans', id, 'any')}>{label}</button>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">Price / 24 hrs</span>
          {PRICE_BANDS.map((p) => (
            <button key={p.id} className="pill" aria-pressed={band === p.id} onClick={() => set('price', p.id, 'any')}>{p.label}</button>
          ))}
        </div>
        <p className="hint">
          Automatic / Manual filters use only what the website states (e.g. “AT &amp; MT”, “Automatic”). Cars whose transmission is not
          stated appear under “Any”.
        </p>
      </div>

      <p className="small muted" style={{ marginBottom: 12 }} aria-live="polite">{list.length} car{list.length === 1 ? '' : 's'} shown</p>

      {list.length ? (
        <div className="vgrid">
          {list.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onDetails={setDetails} onSelect={select} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No cars match these filters.</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setParams({}, { replace: true })}>Clear filters</button>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 18 }}>
        *Seating and category are standard for each model and may differ for individual fleet cars. Fuel and tolls are extra.
      </p>

      {details && <VehicleDetails vehicle={details} onClose={() => setDetails(null)} onSelect={(v) => { setDetails(null); select(v); }} />}
    </div>
  );
}
